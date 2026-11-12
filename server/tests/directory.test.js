/*
 * Directory pagination tests (D4).
 *
 * The route is mounted in-process against a throwaway database so these tests
 * inspect the exact response shape the client consumes. Mongo must be
 * reachable; local runs use the demo container on 127.0.0.1:27017.
 */

process.env.NODE_ENV = "test";
const TEST_SECRET = "directory-pagination-secret";
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

function buildTestUri() {
	const raw =
		process.env.TEST_MONGO_URI ||
		process.env.MONGO_URI ||
		"mongodb://127.0.0.1:27017";
	const { base, query } = mongoParts(raw);
	const dbName = `alumniconnect_directory_test_${process.pid}_${Date.now()}`;
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

async function api(baseUrl, pathname, token) {
	const response = await fetch(`${baseUrl}${pathname}`, {
		headers: token ? { "x-auth-token": token } : {},
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

let server;
let baseUrl;
let member;
let token;

before(async () => {
	const uri = buildTestUri();
	await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

	const password = await bcrypt.hash("regression-pass", 4);
	member = await User.create({
		name: "Directory Viewer",
		email: `directory-viewer-${process.pid}@test.local`,
		password,
		role: "student",
		program: "BTech",
		passing_year: "2024",
	});
	token = tokenFor(member);

	// 12 alumni in the 2020 batch and 33 in 2021: enough to prove the default
	// 40-row page, a second page, and a filtered total smaller than the page.
	const alumni = [];
	for (let i = 0; i < 45; i += 1) {
		const year = i < 12 ? "2020" : "2021";
		alumni.push({
			name: `Directory Alum ${String(i).padStart(2, "0")}`,
			email: `directory-alum-${i}-${process.pid}@test.local`,
			password,
			role: "alumni",
			program: "BTech",
			passing_year: year,
			organisation: i % 3 === 0 ? "Nimbus Labs" : "Other Co",
			working_area: i % 2 === 0 ? "Backend" : "Design",
			location: i % 4 === 0 ? "Bengaluru" : "Hyderabad",
		});
	}
	await User.insertMany(alumni);

	const app = express();
	app.use(express.json());
	app.use("/api/directory", require("../routes/api/directory"));

	await new Promise((resolve) => {
		server = app.listen(0, "127.0.0.1", () => {
			baseUrl = `http://127.0.0.1:${server.address().port}`;
			resolve();
		});
	});
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

test("directory returns the default page of 40", async () => {
	const response = await api(baseUrl, "/api/directory/alumni", token);

	assert.equal(response.status, 200);
	assert.equal(response.body.page, 1);
	assert.equal(response.body.pageSize, 40);
	assert.equal(response.body.total, 45);
	assert.equal(response.body.hasMore, true);
	assert.equal(response.body.items.length, 40);
	for (const person of response.body.items) {
		assert.equal("email" in person, false, "directory leaks an email field");
	}
});

test("page 2 returns the remaining, different items", async () => {
	const first = await api(baseUrl, "/api/directory/alumni?page=1", token);
	const second = await api(baseUrl, "/api/directory/alumni?page=2", token);

	assert.equal(second.status, 200);
	assert.equal(second.body.page, 2);
	assert.equal(second.body.total, 45);
	assert.equal(second.body.hasMore, false);
	assert.equal(second.body.items.length, 5);

	const firstIds = new Set(first.body.items.map((person) => String(person._id)));
	const overlap = second.body.items.filter((person) =>
		firstIds.has(String(person._id))
	);
	assert.equal(overlap.length, 0, "page 2 must not repeat page 1 items");
});

test("filters apply before paging and drive the total", async () => {
	const response = await api(
		baseUrl,
		"/api/directory/alumni?batch=2020&page=1&pageSize=5",
		token
	);

	assert.equal(response.status, 200);
	assert.equal(response.body.total, 12, "total must reflect the batch filter");
	assert.equal(response.body.pageSize, 5);
	assert.equal(response.body.items.length, 5);
	assert.equal(response.body.hasMore, true);
	for (const person of response.body.items) {
		assert.equal(person.passing_year, "2020");
	}

	const second = await api(
		baseUrl,
		"/api/directory/alumni?batch=2020&page=2&pageSize=5",
		token
	);
	assert.equal(second.status, 200);
	assert.equal(second.body.total, 12);
	assert.equal(second.body.items.length, 5);
	const firstIds = new Set(response.body.items.map((person) => String(person._id)));
	assert.equal(
		second.body.items.filter((person) => firstIds.has(String(person._id))).length,
		0,
		"filtered page 2 must not repeat filtered page 1"
	);
});

test("invalid page and pageSize values are clamped", async () => {
	const cases = [
		["?page=0&pageSize=0", 1, 40],
		["?page=-3&pageSize=999", 1, 40],
		["?page=abc&pageSize=abc", 1, 40],
		["?page=2&pageSize=1000", 2, 40],
	];

	for (const [query, expectedPage, expectedSize] of cases) {
		const response = await api(baseUrl, `/api/directory/alumni${query}`, token);
		assert.equal(response.status, 200, `${query} should succeed`);
		assert.equal(response.body.page, expectedPage, `${query} page`);
		assert.equal(response.body.pageSize, expectedSize, `${query} pageSize`);
		assert.ok(Array.isArray(response.body.items), `${query} items`);
	}
});
