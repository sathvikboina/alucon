/*
 * Search relevance evaluation.
 *
 *   npm run search:eval            # evaluate the current index
 *   npm run search:eval -- --rebuild
 *
 * Reports Recall@10, MRR and NDCG@10 for the fixture in searchQueries.js.
 * NDCG uses binary relevance with one relevant record per query. Exits non-zero
 * when Recall@10 falls below the threshold so CI or a release check can gate on
 * it.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const {
  searchAll,
  rebuildSearchIndex,
  ensureSearchIndex,
} = require("../services/searchIndex");
const queries = require("./searchQueries");

const MONGO_URI = process.env.MONGO_URI || process.env.mongoURI_PROD;
const MIN_RECALL = Number(process.env.SEARCH_MIN_RECALL || 0.9);
const K = 10;

const includesTitle = (actual, expected) =>
  String(actual || "")
    .toLowerCase()
    .includes(String(expected || "").toLowerCase());

function dcgAt(rank) {
  return rank > 0 ? 1 / Math.log2(rank + 1) : 0;
}

async function run() {
  if (!MONGO_URI) {
    console.error("No MONGO_URI / mongoURI_PROD configured. Aborting.");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("Connected to", mongoose.connection.name);

  if (process.argv.includes("--rebuild")) {
    const started = Date.now();
    const stats = await rebuildSearchIndex();
    console.log(
      `Rebuilt ${stats.indexed} documents in ${Date.now() - started} ms ` +
        `(${stats.semantic ? "BGE" : "text-only"})`
    );
  } else {
    await ensureSearchIndex();
  }

  const failures = [];
  let recallHits = 0;
  let reciprocalRank = 0;
  let ndcg = 0;

  for (const item of queries) {
    const data = await searchAll({ isAdmin: true }, item.query, { limit: K });
    const results = (data.results || []).slice(0, K);
    const rank =
      results.findIndex(
        (result) =>
          result.type === item.type && includesTitle(result.title, item.title)
      ) + 1;

    if (rank > 0) {
      recallHits += 1;
      reciprocalRank += 1 / rank;
      ndcg += dcgAt(rank);
    } else {
      failures.push({ ...item, top: results.slice(0, 3).map((r) => r.title) });
    }

    console.log(
      `${rank > 0 ? "PASS" : "MISS"}  ${String(rank || "-").padStart(2)}  ` +
        `${item.type.padEnd(8)}  ${item.query}`
    );
  }

  const total = queries.length;
  const recall = total ? recallHits / total : 0;
  const mrr = total ? reciprocalRank / total : 0;
  const ndcgScore = total ? ndcg / total : 0;

  console.log("\nSummary");
  console.log(`  Queries:   ${total}`);
  console.log(`  Recall@${K}: ${(recall * 100).toFixed(1)}%`);
  console.log(`  MRR:       ${mrr.toFixed(3)}`);
  console.log(`  NDCG@${K}:  ${ndcgScore.toFixed(3)}`);

  if (failures.length) {
    console.log("\nMisses");
    for (const miss of failures) {
      console.log(`  ${miss.query} (${miss.type})`);
      console.log(`    expected: ${miss.title}`);
      console.log(`    top:      ${miss.top.join(" | ") || "no results"}`);
    }
  }

  await mongoose.disconnect();

  if (recall < MIN_RECALL) {
    console.error(
      `\nRecall@${K} ${(recall * 100).toFixed(1)}% is below the ${(
        MIN_RECALL * 100
      ).toFixed(1)}% threshold.`
    );
    process.exit(1);
  }
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
