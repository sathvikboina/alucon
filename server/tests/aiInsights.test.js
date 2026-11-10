process.env.NODE_ENV = "test";

const test = require("node:test");
const assert = require("node:assert/strict");

const { countWords, MIN_TLDR_WORDS } = require("../services/aiInsights");

test("TL;DR threshold is 750 words", () => {
  assert.equal(MIN_TLDR_WORDS, 750);
});

test("countWords ignores HTML tags and entities", () => {
  const html = "<p>Hello <strong>world</strong>&nbsp;again</p>";
  assert.equal(countWords(html), 3);
});

test("countWords handles empty and whitespace-only bodies", () => {
  assert.equal(countWords(""), 0);
  assert.equal(countWords("<p> </p>"), 0);
  assert.equal(countWords(null), 0);
});

test("a 749-word post is below the TL;DR threshold", () => {
  const words = Array(MIN_TLDR_WORDS - 1).fill("word").join(" ");
  assert.equal(countWords(`<p>${words}</p>`), MIN_TLDR_WORDS - 1);
  assert.ok(countWords(words) < MIN_TLDR_WORDS);
});

test("a 750-word post meets the TL;DR threshold", () => {
  const words = Array(MIN_TLDR_WORDS).fill("word").join(" ");
  assert.equal(countWords(`<p>${words}</p>`), MIN_TLDR_WORDS);
  assert.ok(countWords(words) >= MIN_TLDR_WORDS);
});
