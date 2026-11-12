process.env.NODE_ENV = "test";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  detectIntent,
  parseSearchQuery,
  matchesNegated,
  tokenize,
  contentTokens,
  matchesAnyToken,
  isUpcomingEvent,
  lexicalScore,
  belongsInIndex,
} = require("../services/searchIndex");

const jobDoc = {
  title: "Applied ML Systems Intern",
  subtitle: "Internship · Bengaluru · Hybrid",
  body: "Work on production machine learning with Python and PyTorch.",
  keywords: ["Machine Learning", "Python"],
};

const postDoc = {
  title: "How we prepared for placements",
  subtitle: "Post · Placements",
  body: "A long note about interviews, referrals and the placement season.",
  keywords: ["placements"],
};

test("intent detection recognises the requested record type", () => {
  assert.equal(detectIntent("Find ML internships in Bangalore").type, "job");
  assert.equal(detectIntent("Find alumni working at Google").type, "alumni");
  assert.equal(detectIntent("Find posts about placements").type, "post");
  assert.equal(detectIntent("Find resources for learning Python").type, "resource");
  assert.equal(detectIntent("Find upcoming technical events").type, "event");
});

test("intent words are removed from content evidence", () => {
  assert.deepEqual(contentTokens(tokenize("Find posts about placements")), [
    "placements",
  ]);
  assert.deepEqual(contentTokens(tokenize("Find alumni working at Google")), [
    "google",
  ]);
  assert.deepEqual(contentTokens(tokenize("Find upcoming technical events")), [
    "technical",
  ]);
});

test("a concrete subject must appear in the document", () => {
  assert.equal(matchesAnyToken(jobDoc, ["google"]), false);
  assert.equal(matchesAnyToken(postDoc, ["placements"]), true);
  // "ml" must not match the "html" substring.
  assert.equal(matchesAnyToken({ title: "HTML basics", body: "", subtitle: "" }, ["ml"]), false);
});

test("content coverage beats an incidental single-word hit", () => {
  const queryTokens = ["ml", "bangalore", "python", "pytorch"];
  const onlyTwo = lexicalScore(
    {
      title: "Applied ML Intern",
      subtitle: "Bengaluru",
      body: "Work on models.",
      keywords: ["Machine Learning"],
    },
    queryTokens,
    "ml bangalore python pytorch",
    queryTokens
  );
  const allFour = lexicalScore(
    {
      ...jobDoc,
      body: "Machine learning role in Bangalore using Python and PyTorch.",
    },
    queryTokens,
    "ml bangalore python pytorch",
    queryTokens
  );
  assert.ok(allFour > onlyTwo, `${allFour} should be greater than ${onlyTwo}`);
});

test("negated phrases are separated from the positive query", () => {
  const parsed = parseSearchQuery(
    "the alumni who DON'T work in Bangalore"
  );
  assert.deepEqual(parsed.content, []);
  assert.deepEqual(
    parsed.negated.map((entry) => entry.phrase),
    ["bangalore"]
  );

  const filtered = parseSearchQuery(
    "alumni in India not in Bangalore or Pune"
  );
  assert.deepEqual(filtered.content, ["india"]);
  assert.deepEqual(
    filtered.negated.map((entry) => entry.phrase),
    ["bangalore", "pune"]
  );
});

test("negated terms exclude matching records and respect synonyms", () => {
  const parsed = parseSearchQuery("alumni who are not working at Google");
  assert.deepEqual(
    parsed.negated.map((entry) => entry.phrase),
    ["google"]
  );

  const atGoogle = {
    title: "Nikhil Sethi",
    subtitle: "Engineer at Google",
    body: "Working on search infrastructure.",
    keywords: [],
  };
  const elsewhere = {
    title: "Rahul Nair",
    subtitle: "Engineer at Meridian Cloud",
    body: "Working on reliability.",
    keywords: [],
  };
  assert.equal(matchesNegated(atGoogle, parsed.negated), true);
  assert.equal(matchesNegated(elsewhere, parsed.negated), false);

  const notBangalore = parseSearchQuery("alumni outside Bangalore");
  assert.equal(
    matchesNegated(
      { title: "A", subtitle: "", body: "Based in Bengaluru.", keywords: [] },
      notBangalore.negated
    ),
    true
  );
  assert.equal(
    matchesNegated(
      { title: "B", subtitle: "", body: "Based in Delhi.", keywords: [] },
      notBangalore.negated
    ),
    false
  );
});

test("past events are excluded from upcoming queries", () => {
  const now = new Date("2026-11-11T00:00:00Z").getTime();
  assert.equal(
    isUpcomingEvent({ meta: { startTime: "2026-11-12T12:30:00Z" } }, now),
    true
  );
  assert.equal(
    isUpcomingEvent({ meta: { startTime: "2026-11-05T13:30:00Z" } }, now),
    false
  );
});

test("incremental indexing keeps only eligible records", () => {
  assert.equal(belongsInIndex("alumni", { blocked: false }), true);
  assert.equal(belongsInIndex("alumni", { blocked: true }), false);
  assert.equal(belongsInIndex("job", { is_active: true }), true);
  assert.equal(belongsInIndex("job", { is_active: false }), false);
  assert.equal(belongsInIndex("post", { group: null }), true);
  assert.equal(belongsInIndex("post", { group: "group-id" }), false);
  assert.equal(belongsInIndex("group", {}), true);
  assert.equal(belongsInIndex("event", null), false);
});
