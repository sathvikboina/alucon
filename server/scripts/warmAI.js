/*
 * Pre-computes thread TL;DR artifacts so a long discussion does not wait on a
 * model call when someone opens it.
 *
 *   GEMINI_API_KEY=... MONGO_URI=... npm run ai:warm
 *
 * Thread TL;DR is the only generative feature left; job fit and
 * mentor/internship matching are deterministic, so there is nothing to warm for
 * those features. Offline (no-key) output is never cached, so this script exits
 * early rather than poisoning the cache with extractive results.
 */

require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../models/User");
const Post = require("../models/Post");
const {
  summarizeThread,
  isConfigured,
  countWords,
  MIN_TLDR_WORDS,
} = require("../services/aiInsights");

const MONGO_URI = process.env.MONGO_URI || process.env.mongoURI_PROD;

if (!MONGO_URI) {
  console.error("No MONGO_URI / mongoURI_PROD configured. Aborting.");
  process.exit(1);
}

if (!isConfigured()) {
  console.log(
    "GEMINI_API_KEY is not set. Offline results are not cached, so there is nothing to warm.\n" +
      "Add GEMINI_API_KEY to server/.env and run this again."
  );
  process.exit(0);
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to", mongoose.connection.name);

  // summarizeThread checks post visibility, so use a real member context.
  const user = await User.findOne({ isAdmin: true }).lean() ||
    (await User.findOne({}).lean());
  if (!user) {
    console.log("No users found. Nothing to warm.");
    await mongoose.disconnect();
    return;
  }

  const posts = await Post.find({}).lean();
  const threads = posts.filter(
    (post) =>
      Array.isArray(post.comments) &&
      post.comments.length >= 2 &&
      countWords(post.text) >= MIN_TLDR_WORDS
  );

  let summaries = 0;
  for (const post of threads) {
    try {
      // The cache key is post-based, so only the first call hits the model.
      await summarizeThread(user, String(post._id));
      summaries += 1;
      console.log(`summary   ${post.heading}`);
    } catch (err) {
      console.warn(`summary failed for ${post.heading}:`, err.message);
    }
  }

  console.log(`\nWarmed ${summaries} thread summaries.`);
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
