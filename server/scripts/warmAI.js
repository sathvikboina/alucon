/*
 * Pre-computes AI artifacts so the demo does not wait on model calls.
 *
 *   GEMINI_API_KEY=... MONGO_URI=... npm run ai:warm
 *
 * Offline (no-key) output is never cached, so this script exits early rather
 * than poisoning the cache with extractive results.
 */

require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../models/User");
const Post = require("../models/Post");
const Job = require("../models/Jobs");
const {
  getBriefing,
  summarizeThread,
  getJobFit,
  isConfigured,
} = require("../services/aiInsights");
const { getInternshipMatches, getMentorMatches } = require("../services/matching");

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

  const users = await User.find({}).lean();
  const jobs = await Job.find({ Job_deadline: { $gte: new Date() } }).lean();
  const posts = await Post.find({}).lean();

  let briefings = 0;
  for (const user of users) {
    try {
      const result = await getBriefing(user);
      briefings += 1;
      console.log(`briefing  ${user.email}  (${result.model})`);
    } catch (err) {
      console.warn(`briefing failed for ${user.email}:`, err.message);
    }
  }

  let fits = 0;
  const students = users.filter(
    (user) => String(user.role || "").toLowerCase() === "student"
  );
  for (const student of students) {
    for (const job of jobs) {
      try {
        const result = await getJobFit(student, String(job._id));
        fits += 1;
        console.log(`fit       ${student.email} → ${job.Job_name} (${result.score}%)`);
      } catch (err) {
        console.warn(`fit failed for ${student.email}/${job.Job_name}:`, err.message);
      }
    }
  }

  let matches = 0;
  for (const student of students) {
    try {
      const internships = await getInternshipMatches(student, { limit: 6 });
      matches += internships.matches.length;
      console.log(
        `internships ${student.email}  (${internships.matches.length} matches, ${internships.model})`
      );
    } catch (err) {
      console.warn(`internship matches failed for ${student.email}:`, err.message);
    }

    try {
      const mentors = await getMentorMatches(student, { limit: 8 });
      matches += mentors.matches.length;
      console.log(
        `mentors     ${student.email}  (${mentors.matches.length} matches, ${mentors.model})`
      );
    } catch (err) {
      console.warn(`mentor matches failed for ${student.email}:`, err.message);
    }
  }

  let summaries = 0;
  const threads = posts.filter((post) => (post.comments || []).length >= 2);
  for (const post of threads) {
    try {
      // The cache key is post-based, so only the first call hits the model.
      await summarizeThread(users[0], String(post._id));
      summaries += 1;
      console.log(`summary   ${post.heading}`);
    } catch (err) {
      console.warn(`summary failed for ${post.heading}:`, err.message);
    }
  }

  console.log(
    `\nWarmed ${briefings} briefings, ${fits} fit scores, ${matches} match cards, ${summaries} thread summaries.`
  );
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
