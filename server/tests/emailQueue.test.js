process.env.NODE_ENV = "test";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
	createEmailQueue,
	normalizeRecipients,
} = require("../services/emailQueue");

const silentLogger = {
	log() {},
	warn() {},
	error() {},
};

const fastQueue = (options = {}) =>
	createEmailQueue({
		sender: async () => true,
		retryDelayMs: 0,
		batchDelayMs: 0,
		logger: silentLogger,
		...options,
	});

test("normalizeRecipients trims, lowercases, dedupes and caps", () => {
	const { recipients, dropped } = normalizeRecipients(
		[
			" A@Example.com ",
			"a@example.com",
			"b@example.com",
			"",
			"not-an-email",
			"c@example.com",
			null,
		],
		2
	);

	assert.deepEqual(recipients, ["a@example.com", "b@example.com"]);
	assert.equal(dropped, 1);
});

test("queue sends every recipient in batches and records stats", async () => {
	const sent = [];
	const queue = fastQueue({
		sender: async ({ to }) => {
			sent.push(to);
			return true;
		},
		batchSize: 2,
		concurrency: 1,
	});

	const result = queue.enqueue({
		subject: "Test broadcast",
		html: "<p>Hello</p>",
		recipients: ["a@example.com", "b@example.com", "c@example.com"],
	});

	assert.equal(result.queued, true);
	assert.equal(result.recipients, 3);

	await queue.drainNow();

	assert.deepEqual(sent.sort(), ["a@example.com", "b@example.com", "c@example.com"]);
	assert.equal(queue.stats.sent, 3);
	assert.equal(queue.stats.failed, 0);
	assert.equal(queue.stats.batches, 2);
});

test("queue retries transient failures before giving up", async () => {
	const attempts = new Map();
	const queue = fastQueue({
		sender: async ({ to }) => {
			const count = (attempts.get(to) || 0) + 1;
			attempts.set(to, count);
			return count >= 3;
		},
		retryLimit: 2,
	});

	queue.enqueue({
		subject: "Retry broadcast",
		html: "<p>Hello</p>",
		recipients: ["retry@example.com"],
	});

	await queue.drainNow();

	assert.equal(attempts.get("retry@example.com"), 3);
	assert.equal(queue.stats.sent, 1);
	assert.equal(queue.stats.failed, 0);
});

test("queue counts a recipient as failed after the retry limit", async () => {
	let attempts = 0;
	const queue = fastQueue({
		sender: async () => {
			attempts += 1;
			return false;
		},
		retryLimit: 1,
	});

	queue.enqueue({
		subject: "Failing broadcast",
		html: "<p>Hello</p>",
		recipients: ["fail@example.com"],
	});

	await queue.drainNow();

	assert.equal(attempts, 2);
	assert.equal(queue.stats.failed, 1);
	assert.equal(queue.stats.sent, 0);
});

test("queue ignores empty broadcasts and rejects when full", async () => {
	let release;
	const gate = new Promise((resolve) => {
		release = resolve;
	});

	const queue = fastQueue({
		sender: async () => {
			await gate;
			return true;
		},
		maxQueuedJobs: 1,
	});

	const empty = queue.enqueue({ subject: "Nobody", recipients: [] });
	assert.equal(empty.queued, false);
	assert.equal(empty.recipients, 0);

	const first = queue.enqueue({
		subject: "First",
		recipients: ["first@example.com"],
	});
	assert.equal(first.queued, true);

	const second = queue.enqueue({
		subject: "Second",
		recipients: ["second@example.com"],
	});
	assert.equal(second.queued, false);
	assert.equal(second.skipped, "queue-full");

	release();
	await queue.drainNow();
});
