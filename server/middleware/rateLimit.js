// Small in-memory abuse controls. The app runs as a single Node process, so a
// Map is enough; it avoids adding another dependency for four routes. Counters
// reset on restart, which is acceptable for a demo deployment.

const buckets = new Map();
const failures = new Map();

const CLEANUP_INTERVAL = 10 * 60 * 1000;

function sweep() {
	const now = Date.now();
	for (const [key, entry] of buckets) {
		if (entry.resetAt <= now) buckets.delete(key);
	}
	for (const [key, entry] of failures) {
		if (entry.resetAt <= now && (!entry.lockedUntil || entry.lockedUntil <= now)) {
			failures.delete(key);
		}
	}
}

setInterval(sweep, CLEANUP_INTERVAL).unref();

function clientIp(req) {
	return req.ip || req.connection?.remoteAddress || "unknown";
}

function normalizeEmail(value) {
	return String(value || "").trim().toLowerCase().slice(0, 254);
}

/**
 * Fixed-window rate limiter.
 * @param {object} options
 * @param {number} options.windowMs
 * @param {number} options.max
 * @param {string} options.message
 * @param {string} options.scope
 * @param {(req: import("express").Request) => string} [options.key]
 */
function rateLimit({ windowMs = 15 * 60 * 1000, max = 20, message = "Too many requests. Please try again later.", scope = "global", key } = {}) {
	return (req, res, next) => {
		const id = `${scope}:${key ? key(req) : clientIp(req)}`;
		const now = Date.now();
		let entry = buckets.get(id);

		if (!entry || entry.resetAt <= now) {
			entry = { count: 0, resetAt: now + windowMs };
			buckets.set(id, entry);
		}

		entry.count += 1;

		if (entry.count > max) {
			const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
			res.set("Retry-After", String(retryAfter));
			return res.status(429).json({
				errors: [{ msg: message }],
				retryAfter,
			});
		}

		return next();
	};
}

function loginFailureKey(req) {
	return `${clientIp(req)}:${normalizeEmail(req.body?.email)}`;
}

/**
 * Temporary lockout after repeated failed logins, keyed by IP + email so one
 * attacker cannot lock out an account from a different address.
 */
function loginLockout() {
	return (req, res, next) => {
		const entry = failures.get(loginFailureKey(req));
		if (entry?.lockedUntil && entry.lockedUntil > Date.now()) {
			const retryAfter = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
			res.set("Retry-After", String(retryAfter));
			return res.status(429).json({
				errors: [{ msg: "Too many failed attempts. Try again later." }],
				retryAfter,
			});
		}
		return next();
	};
}

function recordLoginFailure(req, { maxFailures = 5, windowMs = 15 * 60 * 1000, lockMs = 15 * 60 * 1000 } = {}) {
	const id = loginFailureKey(req);
	const now = Date.now();
	let entry = failures.get(id);

	if (!entry || entry.resetAt <= now) {
		entry = { count: 0, resetAt: now + windowMs, lockedUntil: 0 };
		failures.set(id, entry);
	}

	entry.count += 1;

	if (entry.count >= maxFailures) {
		entry.lockedUntil = now + lockMs;
		entry.resetAt = entry.lockedUntil;
	}

	return entry;
}

function clearLoginFailures(req) {
	failures.delete(loginFailureKey(req));
}

module.exports = {
	rateLimit,
	loginLockout,
	recordLoginFailure,
	clearLoginFailures,
};
