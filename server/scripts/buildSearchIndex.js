/*
 * Rebuilds the search index with the configured embedding provider.
 *
 *   MONGO_URI=... npm run search:index
 *
 * Run this after a seed, after bulk content changes, or after switching
 * EMBEDDING_PROVIDER / EMBEDDING_DIMENSIONS. The API also rebuilds the index on
 * first use when the collection is empty or its vectors are stale.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { rebuildSearchIndex } = require("../services/searchIndex");

const MONGO_URI = process.env.MONGO_URI || process.env.mongoURI_PROD;

if (!MONGO_URI) {
  console.error("No MONGO_URI / mongoURI_PROD configured. Aborting.");
  process.exit(1);
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to", mongoose.connection.name);

  const started = Date.now();
  const stats = await rebuildSearchIndex();
  console.log(
    `Indexed ${stats.indexed} documents in ${Date.now() - started} ms ` +
      `(${stats.semantic ? "semantic" : "text-only"}; ${stats.model})`
  );
  console.log("By type:", stats.byType);

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
