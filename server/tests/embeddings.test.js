/*
 * Provider-layer tests for semantic search embeddings.
 *
 * The Gemini backend is exercised with a stubbed fetch so no network or API key
 * is needed. These tests lock in the request shape (taskType, dimensionality),
 * the single retry for transient failures, and the error behaviour that lets
 * searchAll fall back to lexical scoring.
 */

process.env.NODE_ENV = "test";
process.env.EMBEDDING_PROVIDER = "gemini";
process.env.EMBEDDING_DIMENSIONS = "64";
process.env.GEMINI_API_KEY = "test-key-not-used";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PROVIDER,
  MODEL_NAME,
  EMBEDDING_DIM,
  EMBEDDING_TAG,
  embedTexts,
  embedQuery,
  cosineSimilarity,
} = require("../services/embeddings");

const vector = (seed) => [seed, seed + 1, seed + 2, seed + 3];

function okResponse(count, seed = 1) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      embeddings: Array.from({ length: count }, (_, index) => ({
        values: vector(seed + index),
      })),
    }),
  };
}

function errorResponse(status) {
  return {
    ok: false,
    status,
    text: async () => `provider error ${status}`,
  };
}

test("gemini provider is selected explicitly and tagged with dimensions", () => {
  assert.equal(PROVIDER, "gemini");
  assert.equal(MODEL_NAME, "gemini-embedding-001");
  assert.equal(EMBEDDING_DIM, 64);
  assert.equal(EMBEDDING_TAG, "gemini-embedding-001@64");
});

test("documents are embedded with RETRIEVAL_DOCUMENT and the configured size", async () => {
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return okResponse(2);
  };

  const vectors = await embedTexts(["first passage", "second passage"]);

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /gemini-embedding-001:batchEmbedContents$/);
  assert.equal(calls[0].body.requests.length, 2);
  for (const request of calls[0].body.requests) {
    assert.equal(request.taskType, "RETRIEVAL_DOCUMENT");
    assert.equal(request.outputDimensionality, 64);
    assert.equal(request.model, "models/gemini-embedding-001");
  }
  assert.equal(vectors.length, 2);
  assert.deepEqual(vectors[0], vector(1));
});

test("queries use RETRIEVAL_QUERY and are cached", async () => {
  let count = 0;
  global.fetch = async (url, options) => {
    count += 1;
    const body = JSON.parse(options.body);
    assert.equal(body.requests[0].taskType, "RETRIEVAL_QUERY");
    // Gemini needs no instruction prefix, unlike BGE.
    assert.equal(body.requests[0].content.parts[0].text, "alumni at google");
    return okResponse(1);
  };

  const first = await embedQuery("alumni at google");
  const second = await embedQuery("alumni at google");

  assert.equal(count, 1, "second identical query should hit the cache");
  assert.deepEqual(first, second);
});

test("transient failures retry once before succeeding", async () => {
  let attempts = 0;
  global.fetch = async () => {
    attempts += 1;
    return attempts === 1 ? errorResponse(429) : okResponse(1);
  };

  const vectors = await embedTexts(["retry me"]);
  assert.equal(attempts, 2);
  assert.equal(vectors.length, 1);
});

test("persistent provider failures throw so search can fall back to lexical", async () => {
  let attempts = 0;
  global.fetch = async () => {
    attempts += 1;
    return errorResponse(500);
  };

  await assert.rejects(() => embedTexts(["will fail"]), /Gemini embeddings 500/);
  assert.equal(attempts, 2, "one retry is allowed for 5xx responses");
});

test("client errors are not retried", async () => {
  let attempts = 0;
  global.fetch = async () => {
    attempts += 1;
    return errorResponse(400);
  };

  await assert.rejects(() => embedTexts(["bad request"]), /Gemini embeddings 400/);
  assert.equal(attempts, 1);
});

test("cosineSimilarity normalises vectors of any magnitude", () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.equal(
    Math.round(cosineSimilarity([10, 0], [0.5, 0]) * 100) / 100,
    1
  );
});
