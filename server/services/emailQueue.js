/*
 * In-process queue for announcement email.
 *
 * Creating a job or event used to await one Brevo call per user inside the
 * request handler. This module deduplicates and caps the recipient list,
 * drains it in batches in the background, and retries transient failures so a
 * large community does not stall the API.
 *
 * The queue lives in memory: a process restart drops anything still pending.
 * That is acceptable for the demo deployment; a durable queue can replace the
 * `sender` injection later without touching the routes.
 */

const DEFAULT_MAX_RECIPIENTS = 500;
const DEFAULT_MAX_QUEUED_JOBS = 50;
const DEFAULT_BATCH_SIZE = 25;
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_RETRY_LIMIT = 2;
const DEFAULT_RETRY_DELAY_MS = 1000;
const DEFAULT_BATCH_DELAY_MS = 250;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeRecipients(recipients, maxRecipients = DEFAULT_MAX_RECIPIENTS) {
	const seen = new Set();
	const clean = [];
	let dropped = 0;

	for (const raw of recipients || []) {
		const email = String(raw || "").trim().toLowerCase();
		if (!email || !email.includes("@") || email.length > 254) continue;
		if (seen.has(email)) continue;
		if (clean.length >= maxRecipients) {
			dropped += 1;
			continue;
		}
		seen.add(email);
		clean.push(email);
	}

	return { recipients: clean, dropped };
}

function createEmailQueue({
	sender,
	maxRecipients = DEFAULT_MAX_RECIPIENTS,
	maxQueuedJobs = DEFAULT_MAX_QUEUED_JOBS,
	batchSize = DEFAULT_BATCH_SIZE,
	concurrency = DEFAULT_CONCURRENCY,
	retryLimit = DEFAULT_RETRY_LIMIT,
	retryDelayMs = DEFAULT_RETRY_DELAY_MS,
	batchDelayMs = DEFAULT_BATCH_DELAY_MS,
	logger = console,
} = {}) {
	if (typeof sender !== "function") {
		throw new Error("emailQueue requires a sender function");
	}

	const jobs = [];
	const stats = { enqueued: 0, sent: 0, failed: 0, dropped: 0, batches: 0 };
	let drainPromise = null;

	async function sendWithRetry(job, email) {
		let lastError;
		for (let attempt = 0; attempt <= retryLimit; attempt += 1) {
			try {
				const result = await sender({
					to: email,
					subject: job.subject,
					html: job.html,
					text: job.text,
					meta: job.meta,
				});
				if (result === false) throw new Error("sender returned false");
				return true;
			} catch (err) {
				lastError = err;
				if (attempt < retryLimit) await sleep(retryDelayMs * 2 ** attempt);
			}
		}
		logger.error(
			`emailQueue: giving up on ${email}: ${lastError?.message || lastError}`
		);
		return false;
	}

	async function processJob(job) {
		for (let offset = 0; offset < job.recipients.length; offset += batchSize) {
			const batch = job.recipients.slice(offset, offset + batchSize);
			stats.batches += 1;

			for (let index = 0; index < batch.length; index += concurrency) {
				const chunk = batch.slice(index, index + concurrency);
				const results = await Promise.all(
					chunk.map((email) => sendWithRetry(job, email))
				);
				for (const ok of results) {
					if (ok) stats.sent += 1;
					else stats.failed += 1;
				}
			}

			if (offset + batchSize < job.recipients.length && batchDelayMs > 0) {
				await sleep(batchDelayMs);
			}
		}

		logger.log(
			`emailQueue: broadcast "${job.subject}" finished (${job.recipients.length} recipients)`
		);
	}

	function drain() {
		if (drainPromise) return drainPromise;

		drainPromise = (async () => {
			try {
				while (jobs.length) {
					await processJob(jobs.shift());
				}
			} finally {
				drainPromise = null;
			}
		})();

		return drainPromise;
	}

	function enqueue({ subject, html, text, recipients, meta } = {}) {
		const { recipients: clean, dropped } = normalizeRecipients(
			recipients,
			maxRecipients
		);

		if (!subject || !clean.length) {
			return { queued: false, recipients: 0, dropped };
		}

		if (jobs.length >= maxQueuedJobs) {
			logger.warn(
				`emailQueue: queue full (${jobs.length}); dropping broadcast "${subject}"`
			);
			return { queued: false, recipients: 0, dropped, skipped: "queue-full" };
		}

		jobs.push({ subject, html, text, recipients: clean, meta });
		stats.enqueued += clean.length;
		stats.dropped += dropped;

		if (dropped) {
			logger.warn(
				`emailQueue: capped "${subject}" at ${maxRecipients} recipients (${dropped} dropped)`
			);
		}

		setImmediate(() => {
			drain().catch((err) => logger.error("emailQueue: drain failed:", err));
		});

		return { queued: true, recipients: clean.length, dropped };
	}

	return {
		enqueue,
		drainNow: () => drain(),
		pending: () => jobs.length,
		stats,
	};
}

const sendEmail = require("../middleware/utils/sendEmail");

function intFromEnv(name, fallback) {
	const value = Number.parseInt(process.env[name], 10);
	return Number.isFinite(value) && value > 0 ? value : fallback;
}

const emailQueue = createEmailQueue({
	sender: sendEmail,
	maxRecipients: intFromEnv("EMAIL_BROADCAST_MAX_RECIPIENTS", DEFAULT_MAX_RECIPIENTS),
	batchSize: intFromEnv("EMAIL_BROADCAST_BATCH_SIZE", DEFAULT_BATCH_SIZE),
});

function emailConfigured() {
	return Boolean(process.env.BREVO_API_KEY);
}

function enqueueBroadcast(options) {
	if (!emailConfigured()) {
		console.warn(
			"emailQueue: BREVO_API_KEY is not set; skipping announcement email"
		);
		return { queued: false, recipients: 0, dropped: 0, skipped: "not-configured" };
	}
	return emailQueue.enqueue(options);
}

module.exports = {
	createEmailQueue,
	normalizeRecipients,
	enqueueBroadcast,
	emailQueue,
	emailConfigured,
	DEFAULT_MAX_RECIPIENTS,
};
