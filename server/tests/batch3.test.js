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
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const User = require("../models/User");

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

before(async () => {
	mongoUri = buildTestUri("routes");
	await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });

	member = await makeUser("member", { name: "Batch3 Member" });
	mutualA = await makeUser("mutual-a", { name: "Batch3 Mutual A" });
	mutualB = await makeUser("mutual-b", { name: "Batch3 Mutual B" });
	oneWay = await makeUser("one-way", { name: "Batch3 One Way" });

	// Mutual A and B follow the member back; oneWay does not.
	member.followings = [mutualA._id, mutualB._id, oneWay._id];
	member.followers = [mutualA._id, mutualB._id];
	await member.save();

	const app = express();
	app.use(express.json());
	app.use("/api/users", require("../routes/api/users"));

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
