/*
 * Batch 3 regression tests (D5, D8, D11).
 *
 * These tests mount the real routers in-process so a test can observe the
 * database calls a route makes, while still exercising the middleware chain.
 * Mongo must be reachable; local runs use the demo container on 127.0.0.1.
 */

process.env.NODE_ENV = "test";
const TEST_SECRET = "batch3-regression-secret";
process.env.JWT_SECRET = TEST_SECRET;
process.env.ACCESS_TOKEN_SECRET = TEST_SECRET;

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const User = require("../models/User");
const Infra = require("../models/Infra");
const JoinRequest = require("../models/JoinRequest");

function mongoParts(raw) {
	const match = String(raw).match(
		/^(mongodb(?:\+srv)?:\/\/[^/?]+)(?:\/[^?]*)?(\?.*)?$/
	);
	if (!match) return { base: raw, query: "" };
	return { base: match[1], query: match[2] ? match[2].slice(1) : "" };
}

function buildTestUri(label) {
	const raw =
		process.env.TEST_MONGO_URI ||
		process.env.MONGO_URI ||
		"mongodb://127.0.0.1:27017";
	const { base, query } = mongoParts(raw);
	const dbName = `alumniconnect_batch3_${label}_${process.pid}_${Date.now()}`;
	return `${base}/${dbName}${query ? `?${query}` : ""}`;
}

function tokenFor(user) {
	return jwt.sign(
		{
			user: {
				id: String(user._id),
				role: user.role,
				isAdmin: Boolean(user.isAdmin),
				adminType: user.adminType,
			},
		},
		TEST_SECRET,
		{ expiresIn: "1h" }
	);
}

function listen(app) {
	return new Promise((resolve) => {
		const server = app.listen(0, "127.0.0.1", () => {
			resolve({
				server,
				baseUrl: `http://127.0.0.1:${server.address().port}`,
			});
		});
	});
}

async function api(baseUrl, pathname, { method = "GET", token, body } = {}) {
	const headers = {};
	if (token) headers["x-auth-token"] = token;
	if (body !== undefined) headers["Content-Type"] = "application/json";

	const response = await fetch(`${baseUrl}${pathname}`, {
		method,
		headers,
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const text = await response.text();
	let parsed = null;
	try {
		parsed = text ? JSON.parse(text) : null;
	} catch {
		parsed = text;
	}
	return { status: response.status, body: parsed };
}

async function makeUser(key, overrides = {}) {
	const password = await bcrypt.hash("regression-pass", 4);
	return User.create({
		name: overrides.name || `Batch3 ${key}`,
		email: overrides.email || `${key}-${process.pid}@batch3.test`,
		password,
		role: overrides.role || "student",
		isAdmin: overrides.isAdmin || false,
		adminType: overrides.adminType,
		...overrides,
	});
}

let mongoUri;
let server;
let baseUrl;
let member;
let mutualA;
let mutualB;
let oneWay;
let admin;

before(async () => {
	mongoUri = buildTestUri("routes");
	await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
	// Build the unique email index before concurrent approvals race on it.
	await User.init();

	member = await makeUser("member", { name: "Batch3 Member" });
	mutualA = await makeUser("mutual-a", { name: "Batch3 Mutual A" });
	mutualB = await makeUser("mutual-b", { name: "Batch3 Mutual B" });
	oneWay = await makeUser("one-way", { name: "Batch3 One Way" });
	admin = await makeUser("admin", {
		name: "Batch3 Admin",
		role: "Admin",
		isAdmin: true,
		adminType: "head",
	});

	// Mutual A and B follow the member back; oneWay does not.
	member.followings = [mutualA._id, mutualB._id, oneWay._id];
	member.followers = [mutualA._id, mutualB._id];
	await member.save();

	const app = express();
	app.use(express.json());
	app.use("/api/users", require("../routes/api/users"));
	app.use("/api/showcase", require("../routes/showcaseRoutes"));
	app.use("/api/auth", require("../routes/api/auth"));
	app.use("/api/requests", require("../routes/api/request"));

	const started = await listen(app);
	server = started.server;
	baseUrl = started.baseUrl;
});

after(async () => {
	if (server) {
		await new Promise((resolve) => server.close(resolve));
	}
	if (mongoose.connection.readyState === 1) {
		await mongoose.connection.dropDatabase();
		await mongoose.disconnect();
	}
});

/* ------------------------------------------------------------------ */
/* D5 — friends list uses one $in query                                */
/* ------------------------------------------------------------------ */

test("D5: friends list resolves mutual follows with a single user lookup", async () => {
	const originalFindById = User.findById;
	let findByIdCalls = 0;
	User.findById = function (...args) {
		findByIdCalls += 1;
		return originalFindById.apply(this, args);
	};

	let response;
	try {
		response = await api(baseUrl, `/api/users/friends/${member._id}`, {
			token: tokenFor(member),
		});
	} finally {
		User.findById = originalFindById;
	}

	assert.equal(response.status, 200);
	const names = response.body.map((friend) => friend.name).sort();
	assert.deepEqual(names, ["Batch3 Mutual A", "Batch3 Mutual B"]);
	for (const friend of response.body) {
		assert.equal("password" in friend, false, "friends list must not expose passwords");
	}

	// One lookup reloads the caller in the auth middleware, one fetches the
	// target user. The friends themselves must come from a single $in query,
	// not one findById per mutual follow.
	assert.equal(
		findByIdCalls,
		2,
		`expected 2 findById calls (auth + target user), saw ${findByIdCalls}`
	);
});

/* ------------------------------------------------------------------ */
/* D8 — showcase create/update only accept known model fields          */
/* ------------------------------------------------------------------ */

test("D8: showcase create ignores client-supplied _id and unknown fields", async () => {
	const suppliedId = new mongoose.Types.ObjectId();
	const response = await api(baseUrl, "/api/showcase/infra", {
		method: "POST",
		token: tokenFor(admin),
		body: {
			name: "Batch3 Whitelist Lab",
			_id: suppliedId,
			injected: "should be dropped",
		},
	});

	assert.equal(response.status, 201);
	assert.notEqual(
		String(response.body._id),
		String(suppliedId),
		"create must not accept a caller-supplied _id"
	);
	assert.equal(
		"injected" in response.body,
		false,
		"create must drop fields outside the model schema"
	);

	const saved = await Infra.findById(response.body._id);
	assert.ok(saved, "created document should exist");
	assert.equal(saved.name, "Batch3 Whitelist Lab");
});

test("D8: showcase update drops update operators from req.body", async () => {
	const created = await Infra.create({
		name: "Batch3 Update Target",
		description: "Description must survive a filter attempt",
	});

	const response = await api(baseUrl, `/api/showcase/infra/${created._id}`, {
		method: "PUT",
		token: tokenFor(admin),
		body: { $unset: { description: "" } },
	});

	assert.equal(response.status, 200);
	const saved = await Infra.findById(created._id);
	assert.equal(
		saved.description,
		"Description must survive a filter attempt",
		"update operators must not reach the database"
	);
});

test("D8: showcase update still applies whitelisted fields", async () => {
	const created = await Infra.create({ name: "Batch3 Rename Target" });

	const response = await api(baseUrl, `/api/showcase/infra/${created._id}`, {
		method: "PUT",
		token: tokenFor(admin),
		body: { name: "Batch3 Renamed" },
	});

	assert.equal(response.status, 200);
	assert.equal(response.body.name, "Batch3 Renamed");
});

/* ------------------------------------------------------------------ */
/* D11 — bad reset tokens are client errors, not server errors         */
/* ------------------------------------------------------------------ */

const resetBody = (user, resetToken) => ({
	password: "new-regression-pass",
	password_confirm: "new-regression-pass",
	user_id: String(user._id),
	reset_token: resetToken,
});

test("D11: reset-password rejects an invalid token with 400", async () => {
	const response = await api(baseUrl, "/api/auth/reset-password", {
		method: "POST",
		body: resetBody(member, "not-a-valid-jwt"),
	});

	assert.equal(response.status, 400);
	assert.ok(
		Array.isArray(response.body.errors),
		"invalid reset token should return a validation-style 400 body"
	);
});

test("D11: reset-password rejects an expired token with 400", async () => {
	const withPassword = await User.findById(member._id).select("+password");
	const expired = jwt.sign(
		{ user: { id: String(member._id) } },
		TEST_SECRET + withPassword.password,
		{ expiresIn: -10 }
	);

	const response = await api(baseUrl, "/api/auth/reset-password", {
		method: "POST",
		body: resetBody(member, expired),
	});

	assert.equal(response.status, 400);
	assert.ok(
		Array.isArray(response.body.errors),
		"expired reset token should return a validation-style 400 body"
	);
});

test("D11: verify-reset-link rejects an invalid token with 400", async () => {
	const response = await api(baseUrl, "/api/auth/verify-reset-link", {
		method: "POST",
		body: { user_id: String(member._id), reset_token: "not-a-valid-jwt" },
	});

	assert.equal(response.status, 400);
	assert.ok(
		Array.isArray(response.body.errors),
		"invalid reset link should return a validation-style 400 body"
	);
});

/* ------------------------------------------------------------------ */
/* D15 — messenger date helpers are shared, not duplicated             */
/* ------------------------------------------------------------------ */

const CLIENT_SRC = path.resolve(__dirname, "../../client/src");

async function loadSharedTimeUtil() {
	const file = path.join(CLIENT_SRC, "utils/messageTime.js");
	assert.ok(fs.existsSync(file), "shared messenger time util is missing");
	const source = fs.readFileSync(file, "utf8");
	// The client ships ES modules; load the real source without a bundler.
	const encoded = Buffer.from(source, "utf8").toString("base64");
	return import(`data:text/javascript;base64,${encoded}`);
}

test("D15: timeAgo and formatDateLabel live in one shared util", async () => {
	const util = await loadSharedTimeUtil();

	assert.equal(typeof util.timeAgo, "function");
	assert.equal(typeof util.formatDateLabel, "function");

	const now = Date.now();
	assert.equal(util.timeAgo(new Date(now - 30 * 1000).toISOString()), "now");
	assert.equal(util.timeAgo(new Date(now - 5 * 60 * 1000).toISOString()), "5m");
	assert.equal(util.timeAgo(new Date(now - 3 * 60 * 60 * 1000).toISOString()), "3h");
	assert.equal(util.timeAgo(new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString()), "4d");
	assert.equal(util.timeAgo(""), "");

	assert.equal(util.formatDateLabel(new Date(now).toISOString()), "Today");
	assert.equal(
		util.formatDateLabel(new Date(now - 24 * 60 * 60 * 1000).toISOString()),
		"Yesterday"
	);
	assert.equal(util.formatDateLabel(""), "");

	const sidebar = fs.readFileSync(
		path.join(CLIENT_SRC, "components/messenger/ConversationSidebar.jsx"),
		"utf8"
	);
	const chatWindow = fs.readFileSync(
		path.join(CLIENT_SRC, "components/messenger/ChatWindow.jsx"),
		"utf8"
	);

	assert.match(sidebar, /from "\.\.\/\.\.\/utils\/messageTime"/);
	assert.match(chatWindow, /from "\.\.\/\.\.\/utils\/messageTime"/);
	assert.doesNotMatch(sidebar, /function timeAgo/);
	assert.doesNotMatch(chatWindow, /function formatDateLabel/);
});

/* ------------------------------------------------------------------ */
/* D9 — approval claims the join request before creating the user      */
/* ------------------------------------------------------------------ */

test("D9: two concurrent approvals create exactly one account", async () => {
	const email = `d9-${process.pid}-${Date.now()}@batch3.test`;
	const joinRequest = await JoinRequest.create({
		name: "Batch3 D9 Applicant",
		email,
		password: await bcrypt.hash("regression-pass", 4),
		role: "student",
		program: "BTech",
		passing_year: "2024",
	});

	const [first, second] = await Promise.all([
		api(baseUrl, `/api/requests/join/${joinRequest._id}/approve`, {
			method: "POST",
			token: tokenFor(admin),
		}),
		api(baseUrl, `/api/requests/join/${joinRequest._id}/approve`, {
			method: "POST",
			token: tokenFor(admin),
		}),
	]);

	const statuses = [first.status, second.status].sort((a, b) => a - b);
	assert.deepEqual(
		statuses,
		[200, 409],
		`expected one success and one conflict, saw ${statuses.join(" and ")}`
	);
	assert.equal(
		await User.countDocuments({ email }),
		1,
		"exactly one user must be created for the email"
	);
	assert.equal(
		await JoinRequest.countDocuments({ _id: joinRequest._id }),
		0,
		"the claimed request must not remain in the queue"
	);
});
