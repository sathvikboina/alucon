// Sentence embeddings for semantic search.
//
// Two interchangeable backends:
//
//   local  — BGE-small-en-v1.5 through @huggingface/transformers (ONNX). Used
//            for development and tests. The runtime is ~900 MB, so it cannot be
//            bundled into a Vercel serverless function.
//   gemini — Google's gemini-embedding-001 over HTTPS. No native runtime, so it
//            works inside a serverless function; this is the deployed backend.
//
// EMBEDDING_PROVIDER selects the backend (`local` | `gemini`). When unset the
// module picks Gemini on Vercel if GEMINI_API_KEY exists, and local everywhere
// else. Tests always run against the local model.
//
// BGE is trained for retrieval, so queries use its recommended instruction
// prefix. Gemini takes a taskType instead and needs no prefix.

const PROVIDER = resolveProvider();
const IS_GEMINI = PROVIDER === "gemini";

const GEMINI_ENDPOINT =
	"https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_BATCH_LIMIT = 100;
const GEMINI_TIMEOUT_MS = 10000;
const GEMINI_RETRY_DELAY_MS = 500;

const MODEL_NAME = IS_GEMINI
	? process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001"
	: process.env.EMBEDDING_MODEL || "Xenova/bge-small-en-v1.5";

const DEFAULT_DIM = IS_GEMINI ? 768 : 384;
const EMBEDDING_DIM = (() => {
	const configured = Number(process.env.EMBEDDING_DIMENSIONS);
	if (Number.isInteger(configured) && configured >= 64 && configured <= 3072) {
		return configured;
	}
	return DEFAULT_DIM;
})();

// Stored on every SearchDocument. Changing provider, model or dimensions
// produces a different tag, which makes ensureSearchIndex() rebuild instead of
// comparing incompatible vectors.
const EMBEDDING_TAG = `${MODEL_NAME}@${EMBEDDING_DIM}`;

const QUERY_PREFIX = IS_GEMINI
	? ""
	: "Represent this sentence for searching relevant passages: ";

let extractorPromise = null;
let ready = IS_GEMINI;
const queryCache = new Map();
const QUERY_CACHE_MAX = 200;

/* ------------------------------------------------------------------ */
/* provider selection                                                  */
/* ------------------------------------------------------------------ */

function resolveProvider() {
	const explicit = String(process.env.EMBEDDING_PROVIDER || "")
		.trim()
		.toLowerCase();
	const hasGeminiKey = Boolean(String(process.env.GEMINI_API_KEY || "").trim());

	if (explicit === "gemini") return "gemini";
	if (explicit === "local") return "local";
	if (explicit && explicit !== "auto") {
		console.warn(
			`[embeddings] unknown EMBEDDING_PROVIDER "${explicit}"; using local`
		);
		return "local";
	}

	// Tests must never reach the network.
	if (process.env.NODE_ENV === "test") return "local";

	// Vercel cannot host the ONNX runtime, so prefer the HTTP backend there.
	if (process.env.VERCEL && hasGeminiKey) return "gemini";

	return "local";
}

/* ------------------------------------------------------------------ */
/* local (BGE / ONNX)                                                  */
/* ------------------------------------------------------------------ */

async function getExtractor() {
	if (!extractorPromise) {
		extractorPromise = (async () => {
			// Kept non-literal on purpose: serverless bundlers must not trace the
			// ONNX runtime (~900 MB) into the function. Local installs still resolve
			// it normally; deployments without it fall back to lexical search.
			const dynamicImport = new Function("specifier", "return import(specifier)");
			const { pipeline } = await dynamicImport("@huggingface/transformers");
			const extractor = await pipeline("feature-extraction", MODEL_NAME);
			ready = true;
			return extractor;
		})().catch((err) => {
			extractorPromise = null;
			ready = false;
			throw err;
		});
	}
	return extractorPromise;
}

async function embedLocally(texts) {
	const extractor = await getExtractor();
	const output = await extractor(texts, { pooling: "mean", normalize: true });
	const rows = output.tolist();
	return Array.isArray(rows[0]) ? rows : [rows];
}

/* ------------------------------------------------------------------ */
/* gemini (HTTP)                                                       */
/* ------------------------------------------------------------------ */

function wait(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geminiRequest(path, body) {
	const key = String(process.env.GEMINI_API_KEY || "").trim();
	if (!key) throw new Error("GEMINI_API_KEY is not set");

	let lastError;
	for (let attempt = 0; attempt < 2; attempt += 1) {
		try {
			const response = await fetch(`${GEMINI_ENDPOINT}/${path}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-goog-api-key": key,
				},
				body: JSON.stringify(body),
				signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
			});

			if (response.ok) return response.json();

			const detail = await response.text().catch(() => "");
			lastError = new Error(
				`Gemini embeddings ${response.status}: ${detail.slice(0, 200)}`
			);
			// 429 and 5xx are transient; auth and bad-request errors are not.
			if (response.status !== 429 && response.status < 500) throw lastError;
		} catch (err) {
			lastError = err;
			if (err?.name === "AbortError" || err?.name === "TimeoutError") {
				lastError = new Error("Gemini embeddings timed out");
			} else if (err?.message?.startsWith("Gemini embeddings 4")) {
				throw err;
			}
		}

		if (attempt === 0) await wait(GEMINI_RETRY_DELAY_MS);
	}
	throw lastError || new Error("Gemini embeddings failed");
}

function geminiModelBody(request) {
	return {
		model: `models/${MODEL_NAME}`,
		content: { parts: [{ text: request.text }] },
		taskType: request.taskType,
		outputDimensionality: EMBEDDING_DIM,
	};
}

async function embedWithGemini(texts, taskType) {
	const vectors = [];
	for (let index = 0; index < texts.length; index += GEMINI_BATCH_LIMIT) {
		const batch = texts.slice(index, index + GEMINI_BATCH_LIMIT);
		const payload = await geminiRequest(
			`${MODEL_NAME}:batchEmbedContents`,
			{
				requests: batch.map((text) => geminiModelBody({ text, taskType })),
			}
		);
		const rows = payload?.embeddings || [];
		if (rows.length !== batch.length) {
			throw new Error(
				`Gemini embeddings returned ${rows.length} vectors for ${batch.length} inputs`
			);
		}
		for (const row of rows) {
			if (!Array.isArray(row?.values) || !row.values.length) {
				throw new Error("Gemini embeddings returned an empty vector");
			}
			vectors.push(row.values);
		}
	}
	return vectors;
}

/* ------------------------------------------------------------------ */
/* shared API                                                          */
/* ------------------------------------------------------------------ */

function cleanInput(texts) {
	return (Array.isArray(texts) ? texts : [texts])
		.map((text) => String(text || "").trim())
		.filter(Boolean);
}

/**
 * Embed indexed passages. Returns one vector per non-empty input.
 */
async function embedTexts(texts) {
	const input = cleanInput(texts);
	if (!input.length) return [];

	if (IS_GEMINI) return embedWithGemini(input, "RETRIEVAL_DOCUMENT");

	const output = await embedLocally(input);
	ready = true;
	return output;
}

async function embedText(text) {
	const [vector] = await embedTexts([text]);
	return vector || [];
}

async function embedQuery(text) {
	const key = String(text || "").trim().toLowerCase();
	if (!key) return [];
	if (queryCache.has(key)) return queryCache.get(key);

	const vector = IS_GEMINI
		? (await embedWithGemini([QUERY_PREFIX + key], "RETRIEVAL_QUERY"))[0] || []
		: await embedText(`${QUERY_PREFIX}${key}`);

	if (queryCache.size >= QUERY_CACHE_MAX) {
		const oldest = queryCache.keys().next().value;
		queryCache.delete(oldest);
	}
	queryCache.set(key, vector);
	return vector;
}

function cosineSimilarity(a, b) {
	if (!Array.isArray(a) || !Array.isArray(b) || !a.length || !b.length) return 0;
	const length = Math.min(a.length, b.length);
	let dot = 0;
	let normA = 0;
	let normB = 0;
	for (let i = 0; i < length; i += 1) {
		dot += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}
	if (!normA || !normB) return 0;
	return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function warmup() {
	if (IS_GEMINI) {
		if (!String(process.env.GEMINI_API_KEY || "").trim()) {
			throw new Error("GEMINI_API_KEY is not set");
		}
		return { provider: PROVIDER, model: MODEL_NAME, dimensions: EMBEDDING_DIM };
	}
	await getExtractor();
	return { provider: PROVIDER, model: MODEL_NAME, dimensions: EMBEDDING_DIM };
}

module.exports = {
	PROVIDER,
	MODEL_NAME,
	EMBEDDING_DIM,
	EMBEDDING_TAG,
	QUERY_PREFIX,
	embedTexts,
	embedText,
	embedQuery,
	cosineSimilarity,
	warmup,
	isReady: () => ready,
};
