// Minimal, dependency-free Gemini client.
//
// The app only needs two things from a model: strict JSON for structured UI
// cards, and a graceful failure path. If no key is configured (or the provider
// is down) callers fall back to deterministic, extractive output, so the demo
// keeps working without pretending an LLM answered.

// 2.5 and older are retired for new API keys (404). The 3.x stable models are
// the current target; 3-flash-preview is first because it is the model that
// answers reliably within the request budget on the free tier.
const FALLBACK_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-flash-latest",
];
const MODEL_TIMEOUT_MS = 25000;
// A request may try several models. Cap the whole chain so a slow provider
// cannot hold an HTTP request open for minutes. The UI shows the offline
// fallback when this expires, so keep the ceiling short enough that a click
// still feels like it did something.
const TOTAL_TIMEOUT_MS = 15000;
// Model names drift faster than deployments. The provider's ListModels
// endpoint is queried once per warm process so generation keeps working when a
// hard-coded name is retired, instead of silently falling back to offline text.
const MODEL_CACHE_TTL_MS = 60 * 60 * 1000;
let modelCache = { at: 0, models: [] };

// When every model in the chain fails, the provider is usually having a bad
// minute (503 high demand / 429 quota / timeouts). Retrying the whole chain on
// the next click makes the UI wait ~20s just to show the offline fallback, so
// remember the outage briefly and answer instantly instead. The diagnostics
// route bypasses this flag so an admin can still probe the provider.
const UNAVAILABLE_COOLDOWN_MS = 3 * 60 * 1000;
let unavailableUntil = 0;

function apiKey() {
  const raw =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    "";
  // Environment values pasted into a dashboard often carry a trailing newline
  // or wrapping quotes. Embeddings trimmed the key; this client did not, so
  // the same key authenticated over the x-goog-api-key header but produced a
  // 401 when appended to the URL as ?key=.
  return String(raw).trim().replace(/^["']|["']$/g, "");
}

function isConfigured() {
  return Boolean(apiKey());
}

function modelList() {
  const preferred = (process.env.GEMINI_MODEL || "").trim();
  const list = preferred ? [preferred, ...FALLBACK_MODELS] : FALLBACK_MODELS;
  return [...new Set(list)];
}

async function discoverModels() {
  if (
    modelCache.models.length &&
    Date.now() - modelCache.at < MODEL_CACHE_TTL_MS
  ) {
    return modelCache.models;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
        apiKey()
      )}&pageSize=1000`,
      { signal: controller.signal }
    );
    if (!res.ok) return modelCache.models;

    const body = await res.json();
    const names = (body.models || [])
      .filter((model) =>
        (model.supportedGenerationMethods || []).includes("generateContent")
      )
      .map((model) => String(model.name || "").replace(/^models\//, ""))
      // Embedding, image, video, audio and "omni" models cannot answer a
      // strict JSON prompt and waste the request budget when tried.
      .filter(
        (name) =>
          name &&
          !/(embedding|aqa|imagen|image|veo|tts|native-audio|audio|omni|learnlm)/i.test(
            name
          )
      );

    // Prefer stable text Flash models, then the latest alias, then previews.
    names.sort((a, b) => {
      const rank = (name) => {
        if (/flash/i.test(name) && !/(lite|preview|exp)/i.test(name)) return 0;
        if (/flash-latest/i.test(name)) return 1;
        if (/flash/i.test(name) && /lite/i.test(name)) return 2;
        if (/flash/i.test(name)) return 3;
        return 4;
      };
      return rank(a) - rank(b);
    });

    if (names.length) modelCache = { at: Date.now(), models: names };
    return modelCache.models;
  } catch (err) {
    return modelCache.models;
  } finally {
    clearTimeout(timer);
  }
}

async function modelListAsync() {
  const preferred = (process.env.GEMINI_MODEL || "").trim();
  const discovered = await discoverModels();
  const list = [
    ...(preferred ? [preferred] : []),
    ...discovered,
    ...FALLBACK_MODELS,
  ];
  return [...new Set(list)].slice(0, 12);
}

function extractJson(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch (err) {
    return null;
  }
}

async function callModel(model, prompt, options) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? MODEL_TIMEOUT_MS
  );

  try {
    const generationConfig = {
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxOutputTokens ?? 1200,
      responseMimeType: "application/json",
    };

    // Gemini 3 enables "thinking" by default. On a long thread prompt that
    // consumed ~860 tokens and truncated the JSON, so keep reasoning low.
    if (model.startsWith("gemini-2.5")) {
      generationConfig.thinkingConfig = { thinkingBudget: 0 };
    } else if (model.startsWith("gemini-3")) {
      generationConfig.thinkingConfig = { thinkingLevel: "low" };
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey())}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig,
        }),
      }
    );

    const raw = await res.text();

    // A missing model is recoverable: try the next one in the list.
    if (res.status === 404) return { notFound: true };

    if (!res.ok) {
      return { error: `HTTP ${res.status}: ${raw.slice(0, 180)}` };
    }

    let body;
    try {
      body = JSON.parse(raw);
    } catch (err) {
      return { error: "Provider returned invalid JSON" };
    }

    const text = (body.candidates?.[0]?.content?.parts || [])
      .map((part) => part.text || "")
      .join("")
      .trim();

    const data = extractJson(text);
    if (!data) {
      if (process.env.AI_DEBUG === "true") {
        console.warn(
          `[ai] ${model} raw output (${text.length} chars, finish=${
            body.candidates?.[0]?.finishReason
          }, usage=${JSON.stringify(body.usageMetadata || {})}):`,
          text.slice(0, 300),
          "...",
          text.slice(-120)
        );
      }
      return { error: "Model returned no parseable JSON" };
    }
    return { data };
  } catch (err) {
    return {
      error:
        err.name === "AbortError" ? "Model call timed out" : err.message || "Model call failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ask Gemini for a strict JSON object.
 * @returns {Promise<{data: object, model: string}|null>}
 */
async function generateJSON(prompt, options = {}) {
  if (!isConfigured()) return null;
  if (Date.now() < unavailableUntil) return null;

  const deadline = Date.now() + (options.timeoutMs ?? TOTAL_TIMEOUT_MS);
  const models = await modelListAsync();
  let lastError = "";
  for (const model of models) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      lastError = lastError || "Model call timed out";
      break;
    }

    const started = Date.now();
    const result = await callModel(model, prompt, {
      ...options,
      timeoutMs: Math.min(remaining, MODEL_TIMEOUT_MS),
    });
    const elapsed = Date.now() - started;
    if (result.data) {
      unavailableUntil = 0;
      if (process.env.AI_DEBUG === "true") {
        console.error(`[ai] ${model} answered in ${elapsed}ms`);
      }
      return { data: result.data, model };
    }
    if (process.env.AI_DEBUG === "true") {
      console.warn(
        `[ai] ${model} failed after ${elapsed}ms: ${
          result.notFound ? "404 not found" : result.error
        }`
      );
    }
    if (result.notFound) continue;
    lastError = result.error || lastError;
    // Try the next model: a 400 can be model-specific (e.g. thinking config),
    // and an invalid key simply fails fast on each attempt.
    continue;
  }

  if (lastError) console.warn("[ai] Gemini unavailable:", lastError);
  unavailableUntil = Date.now() + UNAVAILABLE_COOLDOWN_MS;
  return null;
}

/**
 * Probe the provider from a head-admin-only diagnostics route.
 * Returns the model names the key can see and the result of one tiny call per
 * model, without exposing the key itself.
 */
async function diagnose(prompt = 'Return strict JSON only: {"ok":true}') {
  const models = await modelListAsync();
  const results = [];
  for (const model of models.slice(0, 8)) {
    const result = await callModel(model, prompt, {
      maxOutputTokens: 50,
      temperature: 0,
      timeoutMs: 8000,
    });
    results.push({
      model,
      ok: Boolean(result.data),
      notFound: Boolean(result.notFound),
      error: result.error || "",
    });
  }
  return { configured: isConfigured(), models, results };
}

module.exports = { generateJSON, isConfigured, modelList, modelListAsync, diagnose };
