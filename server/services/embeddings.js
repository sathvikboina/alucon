// BGE-small-en-v1.5 sentence embeddings for semantic search.
//
// The model runs locally through @huggingface/transformers (ONNX). It is loaded
// lazily so the API starts even when the model cache is cold; the first search
// or index build pays the load cost once.
//
// BGE is trained for retrieval, so queries use its recommended instruction
// prefix while indexed passages are embedded as-is.

const MODEL_NAME =
  process.env.EMBEDDING_MODEL || "Xenova/bge-small-en-v1.5";
const EMBEDDING_DIM = 384;
const QUERY_PREFIX =
  "Represent this sentence for searching relevant passages: ";

let extractorPromise = null;
let ready = false;
const queryCache = new Map();
const QUERY_CACHE_MAX = 200;

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
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

async function embedTexts(texts) {
  const input = (Array.isArray(texts) ? texts : [texts])
    .map((text) => String(text || "").trim())
    .filter(Boolean);
  if (!input.length) return [];

  const extractor = await getExtractor();
  const output = await extractor(input, { pooling: "mean", normalize: true });
  const rows = output.tolist();
  return Array.isArray(rows[0]) ? rows : [rows];
}

async function embedText(text) {
  const [vector] = await embedTexts([text]);
  return vector || [];
}

async function embedQuery(text) {
  const key = String(text || "").trim().toLowerCase();
  if (!key) return [];
  if (queryCache.has(key)) return queryCache.get(key);

  const vector = await embedText(`${QUERY_PREFIX}${key}`);
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
  await getExtractor();
  return { model: MODEL_NAME, dimensions: EMBEDDING_DIM };
}

module.exports = {
  MODEL_NAME,
  EMBEDDING_DIM,
  QUERY_PREFIX,
  embedTexts,
  embedText,
  embedQuery,
  cosineSimilarity,
  warmup,
  isReady: () => ready,
};
