/*
 * Security and workflow regression tests (F-38).
 *
 * The API boots as a real process against a throwaway database, so these tests
 * exercise the middleware chain exactly as a browser would. Mongo must be
 * reachable; CI provides a service container and local runs use the demo
 * container on 127.0.0.1:27017.
 */

process.env.NODE_ENV = "test";
const TEST_SECRET = "security-regression-secret";
process.env.JWT_SECRET = TEST_SECRET;

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const MentorShipRequest = require("../models/MentorShipRequest");
const User = require("../models/User");
const Group = require("../models/Group");
const Post = require("../models/Post");
const SupportForm = require("../models/SupportForm");
const Notification = require("../models/Notifications");
const EventQuestion = require("../models/EventQuestion");
const Achievement = require("../models/Achievement");

const SERVER_DIR = path.resolve(__dirname, "..");

let server;
let serverLog = "";
let baseUrl = "";
let testUri = "";
let users = {};
let group;
let privatePost;

/* ------------------------------------------------------------------ */
/* Harness                                                             */
/* ------------------------------------------------------------------ */

function mongoParts(raw) {
	const match = String(raw).match(/^(mongodb(?:\+srv)?:\/\/[^/?]+)(?:\/[^?]*)?(\?.*)?$/);
	if (!match) return { base: raw, query: "" };
	return { base: match[1], query: match[2] ? match[2].slice(1) : "" };
}

function buildTestUri() {
	const raw =
		process.env.TEST_MONGO_URI ||
		process.env.MONGO_URI ||
		"mongodb://127.0.0.1:27017";
	const { base, query } = mongoParts(raw);
	const dbName = `alumniconnect_test_${process.pid}_${Date.now()}`;
	return `${base}/${dbName}${query ? `?${query}` : ""}`;
}

function freePort() {
	return new Promise((resolve, reject) => {
		const probe = net.createServer();
		probe.once("error", reject);
		probe.listen(0, "127.0.0.1", () => {
			const { port } = probe.address();
			probe.close(() => resolve(port));
		});
	});
}

async function waitForApi(url, timeoutMs = 30000) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (server.exitCode !== null) {
			throw new Error(`API exited before it was ready:\n${serverLog}`);
		}
		try {
			const response = await fetch(`${url}/api/availability`);
			if (response.ok) return;
		} catch {
			// The socket is not open yet; retry until the deadline.
		}
		await new Promise((resolve) => setTimeout(resolve, 200));
	}
	throw new Error(`API did not become ready:\n${serverLog}`);
}

async function stopServer() {
	if (!server || server.exitCode !== null) return;
	await new Promise((resolve) => {
		const timer = setTimeout(() => {
			if (server.exitCode === null) server.kill("SIGKILL");
			resolve();
		}, 5000);
		server.once("exit", () => {
			clearTimeout(timer);
			resolve();
		});
		server.kill("SIGTERM");
	});
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

async function api(pathname, { method = "GET", token, body } = {}) {
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
	const doc = await User.create({
		name: overrides.name || `Regression ${key}`,
		email: overrides.email || `${key}@regression.test`,
		password,
		role: overrides.role || "student",
		isAdmin: overrides.isAdmin || false,
		adminType: overrides.adminType,
		program: "BTech",
		passing_year: "2024",
		skills: ["JavaScript"],
		...overrides,
	});
	users[key] = doc;
	return doc;
}

const requestMentorship = (from, to, area = "Career") =>
	api("/api/mentorship", {
		method: "POST",
		token: tokenFor(from),
		body: {
			requestedTo: String(to._id),
			areaOfHelp: area,
			message: "Regression test request",
		},
	});

const updateMentorship = (id, actor, status) =>
	api(`/api/mentorship/${id}`, {
		method: "PUT",
		token: tokenFor(actor),
		body: { status },
	});

/* ------------------------------------------------------------------ */
/* Setup / teardown                                                    */
/* ------------------------------------------------------------------ */

before(async () => {
	testUri = buildTestUri();
	await mongoose.connect(testUri, { serverSelectionTimeoutMS: 10000 });

	await makeUser("admin", {
		name: "Regression Admin",
		email: "admin@regression.test",
		role: "Admin",
		isAdmin: true,
		adminType: "head",
	});
	await makeUser("mentor", {
		name: "Regression Mentor",
		email: "mentor@regression.test",
		role: "alumni",
		mentorship: { available: true, capacity: 1, areas: ["Career"], mode: "Remote" },
	});
	await makeUser("mentee1", { name: "Regression Mentee One", email: "mentee1@regression.test" });
	await makeUser("mentee2", { name: "Regression Mentee Two", email: "mentee2@regression.test" });
	await makeUser("mentee3", { name: "Regression Mentee Three", email: "mentee3@regression.test" });
	await makeUser("mentee4", { name: "Regression Mentee Four", email: "mentee4@regression.test" });
	await makeUser("mentee5", { name: "Regression Mentee Five", email: "mentee5@regression.test" });
	await makeUser("outsider", { name: "Regression Outsider", email: "outsider@regression.test" });
	await makeUser("groupMember", {
		name: "Regression Group Member",
		email: "groupmember@regression.test",
	});

	// Build the index before the API starts so duplicate checks are enforced
	// by the database from the first request.
	await MentorShipRequest.init();

	group = await Group.create({
		name: `Regression Invite Group ${Date.now()}`,
		description: "Invite-only group used by the security regression tests.",
		category: "INVITE",
		access: "INVITE",
		owner: users.mentor._id,
		members: [{ user: users.groupMember._id, role: "member" }],
	});

	privatePost = await Post.create({
		user: users.mentor._id,
		heading: "Private group post",
		text: "Only members of this group should be able to read it.",
		name: users.mentor.name,
		channel: "General",
		group: group._id,
	});

	const port = await freePort();
	baseUrl = `http://127.0.0.1:${port}`;

	server = spawn(process.execPath, ["server.js"], {
		cwd: SERVER_DIR,
		env: {
			...process.env,
			NODE_ENV: "test",
			PORT: String(port),
			MONGO_URI: testUri,
			JWT_SECRET: TEST_SECRET,
			ACCESS_TOKEN_SECRET: TEST_SECRET,
		},
		stdio: ["ignore", "pipe", "pipe"],
	});
	server.stdout.on("data", (chunk) => {
		serverLog += chunk.toString();
	});
	server.stderr.on("data", (chunk) => {
		serverLog += chunk.toString();
	});

	await waitForApi(baseUrl);
});

beforeEach(async () => {
	await MentorShipRequest.deleteMany({});
});

after(async () => {
	await stopServer();
	if (mongoose.connection.readyState === 1) {
		await mongoose.connection.dropDatabase();
		await mongoose.disconnect();
	}
});

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

test("unauthenticated writes return 401 across the API", async () => {
	const writes = [
		["POST", "/api/posts/create-post"],
		["POST", "/api/posts/64b000000000000000000000/likes"],
		["DELETE", "/api/posts/64b000000000000000000000"],
		["POST", "/api/mentorship"],
		["PUT", "/api/mentorship/64b000000000000000000000"],
		["POST", "/api/groups"],
		["POST", "/api/groups/64b000000000000000000000/join"],
		["POST", "/api/job/create-job"],
		["POST", "/api/event/create-event"],
		["POST", "/api/messages/send"],
		["POST", "/api/conversations/start"],
		["POST", "/api/doubts"],
		["POST", "/api/block/block"],
		["PUT", "/api/users/64b000000000000000000000/follow"],
		["POST", "/api/resources/upload"],
		["POST", "/api/showcase/infra"],
		["POST", "/api/achievements"],
		["POST", "/api/achievement-categories"],
		["POST", "/api/featured-achievements"],
	];

	for (const [method, pathname] of writes) {
		const response = await api(pathname, { method, body: {} });
		assert.equal(
			response.status,
			401,
			`${method} ${pathname} should require authentication`
		);
	}
});

test("showcase writes are admin only", async () => {
	const payload = { name: `Regression Lab ${Date.now()}` };

	for (const [method, pathname] of [
		["POST", "/api/showcase/infra"],
		["PUT", "/api/showcase/infra/64b000000000000000000000"],
		["DELETE", "/api/showcase/infra/64b000000000000000000000"],
	]) {
		const denied = await api(pathname, {
			method,
			token: tokenFor(users.mentor),
			body: payload,
		});
		assert.equal(denied.status, 401, `${method} ${pathname} should reject non-admins`);
	}

	const allowed = await api("/api/showcase/infra", {
		method: "POST",
		token: tokenFor(users.admin),
		body: payload,
	});
	assert.equal(allowed.status, 201);
	assert.equal(allowed.body.name, payload.name);
});

test("private group posts are invisible to non-members", async () => {
	const hidden = await api(`/api/posts/${privatePost._id}`, {
		token: tokenFor(users.outsider),
	});
	assert.equal(hidden.status, 404);

	const member = await api(`/api/posts/${privatePost._id}`, {
		token: tokenFor(users.groupMember),
	});
	assert.equal(member.status, 200);

	const admin = await api(`/api/posts/${privatePost._id}`, {
		token: tokenFor(users.admin),
	});
	assert.equal(admin.status, 200);
});

test("duplicate mentorship requests are rejected", async () => {
	const first = await requestMentorship(users.mentee1, users.mentor);
	assert.equal(first.status, 200);

	const second = await requestMentorship(users.mentee1, users.mentor);
	assert.equal(second.status, 409);
});

test("parallel duplicate requests create exactly one row", async () => {
	const results = await Promise.all([
		requestMentorship(users.mentee1, users.mentor),
		requestMentorship(users.mentee1, users.mentor),
		requestMentorship(users.mentee1, users.mentor),
	]);

	assert.equal(results.filter((result) => result.status === 200).length, 1);
	assert.equal(results.filter((result) => result.status === 409).length, 2);

	const rows = await MentorShipRequest.countDocuments({
		requestedBy: users.mentee1._id,
		requestedTo: users.mentor._id,
	});
	assert.equal(rows, 1);
});

test("the unique partial index enforces the duplicate rule", async () => {
	await MentorShipRequest.create({
		requestedBy: users.mentee1._id,
		requestedTo: users.mentor._id,
		areaOfHelp: "Career",
		status: "pending",
	});

	await assert.rejects(
		() =>
			MentorShipRequest.create({
				requestedBy: users.mentee1._id,
				requestedTo: users.mentor._id,
				areaOfHelp: "Career",
				status: "accepted",
			}),
		(error) => error && error.code === 11000
	);

	// Declined rows are outside the partial index, so history can accumulate.
	await MentorShipRequest.create({
		requestedBy: users.mentee1._id,
		requestedTo: users.mentor._id,
		areaOfHelp: "Career",
		status: "declined",
	});
});

test("mentorship transitions follow the state machine", async () => {
	const created = await requestMentorship(users.mentee1, users.mentor);
	assert.equal(created.status, 200);
	const id = created.body._id;

	const menteeAccept = await updateMentorship(id, users.mentee1, "accepted");
	assert.equal(menteeAccept.status, 403);

	const skippedAccept = await updateMentorship(id, users.mentor, "active");
	assert.equal(skippedAccept.status, 400);

	const accepted = await updateMentorship(id, users.mentor, "accepted");
	assert.equal(accepted.status, 200);
	assert.equal(accepted.body.status, "accepted");

	const skippedActive = await updateMentorship(id, users.mentee1, "completed");
	assert.equal(skippedActive.status, 400);

	const active = await updateMentorship(id, users.mentee1, "active");
	assert.equal(active.status, 200);

	const completed = await updateMentorship(id, users.mentor, "completed");
	assert.equal(completed.status, 200);
	assert.equal(completed.body.status, "completed");
});

test("mentor capacity is enforced when accepting", async () => {
	const first = await requestMentorship(users.mentee1, users.mentor);
	const second = await requestMentorship(users.mentee2, users.mentor);
	assert.equal(first.status, 200);
	assert.equal(second.status, 200);

	const accepted = await updateMentorship(first.body._id, users.mentor, "accepted");
	assert.equal(accepted.status, 200);

	const overCapacity = await updateMentorship(second.body._id, users.mentor, "accepted");
	assert.equal(overCapacity.status, 409);

	const blocked = await requestMentorship(users.mentee3, users.mentor);
	assert.equal(blocked.status, 409);
});

test("parallel accepts cannot exceed mentor capacity (F-12 race)", async () => {
	const contenders = [
		users.mentee1,
		users.mentee2,
		users.mentee3,
		users.mentee4,
		users.mentee5,
	];

	const created = [];
	for (const mentee of contenders) {
		const response = await requestMentorship(mentee, users.mentor);
		assert.equal(response.status, 200);
		created.push(response.body._id);
	}

	const results = await Promise.all(
		created.map((id) => updateMentorship(id, users.mentor, "accepted"))
	);

	const accepted = results.filter((result) => result.status === 200);
	const rejected = results.filter((result) => result.status === 409);

	assert.equal(accepted.length, 1, "exactly one accept may win the last slot");
	assert.equal(rejected.length, contenders.length - 1);

	const acceptedRows = await MentorShipRequest.countDocuments({
		requestedTo: users.mentor._id,
		status: { $in: ["accepted", "active"] },
	});
	assert.equal(acceptedRows, 1);
});

/* ------------------------------------------------------------------ */
/* Phase D hardening regressions                                       */
/* ------------------------------------------------------------------ */

test("directory search escapes regex metacharacters (D1)", async () => {
	const response = await api("/api/directory/alumni?search=.*", {
		token: tokenFor(users.mentee1),
	});

	assert.equal(response.status, 200);
	assert.deepEqual(
		response.body.items,
		[],
		"a literal '.*' search must not match every alumni"
	);
	assert.equal(response.body.total, 0);
});

test("achievement search escapes regex metacharacters (D1)", async () => {
	await Achievement.create({
		title: "Regression award",
		description: "Search escaping fixture",
		recipientType: "alumni",
		recipient: users.mentor._id,
		submittedBy: users.mentor._id,
		recipientName: users.mentor.name,
		category: new mongoose.Types.ObjectId(),
		achievementDate: new Date(),
		status: "approved",
	});

	const response = await api("/api/achievements?search=.*", {
		token: tokenFor(users.mentee1),
	});

	assert.equal(response.status, 200);
	assert.equal(
		response.body.total,
		0,
		"a literal '.*' search must not match every achievement"
	);
});

test("directory and user search do not expose emails (D2)", async () => {
	const directory = await api("/api/directory/alumni", {
		token: tokenFor(users.mentee1),
	});
	assert.equal(directory.status, 200);
	assert.ok(
		directory.body.items.length > 0,
		"directory should return the alumni fixture"
	);
	for (const person of directory.body.items) {
		assert.equal("email" in person, false, "directory leaks an email field");
	}

	const search = await api("/api/users/search/all", {
		token: tokenFor(users.mentee1),
	});
	assert.equal(search.status, 200);
	for (const person of search.body) {
		assert.equal("email" in person, false, "user search leaks an email field");
	}
});

test("GET /api/support does not create a form row (D3)", async () => {
	await SupportForm.deleteMany({});
	const response = await api("/api/support", {
		token: tokenFor(users.mentor),
	});

	assert.equal(response.status, 200);
	assert.deepEqual(response.body.options, []);
	assert.equal(
		await SupportForm.countDocuments({}),
		0,
		"a read request must not create a support form"
	);
});

test("admin notification creation satisfies the required owner field (D6)", async () => {
	const response = await api("/api/notifications/addNotifications", {
		method: "POST",
		token: tokenFor(users.admin),
		body: {
			name: "Regression notice",
			description: "Created by the hardening test",
			link: "/showcase",
		},
	});

	assert.equal(response.status, 200);
	const saved = await Notification.findOne({ Notification_name: "Regression notice" });
	assert.ok(saved, "notification should be saved");
	assert.equal(String(saved.userID), String(users.admin._id));
});

test("stale admin claims in a JWT cannot delete another user's post (D7)", async () => {
	const post = await Post.create({
		user: users.mentor._id,
		heading: "Stale admin check",
		text: "Only the owner or a current admin may delete this.",
		name: users.mentor.name,
		channel: "General",
	});

	const forgedAdmin = tokenFor({
		_id: users.mentee1._id,
		role: "head_admin",
		isAdmin: true,
		adminType: "head",
	});

	const response = await api(`/api/posts/${post._id}`, {
		method: "DELETE",
		token: forgedAdmin,
	});

	assert.equal(response.status, 401);
	assert.ok(await Post.findById(post._id), "post must still exist");
});

test("stale admin claims in a JWT cannot delete someone else's question (D7)", async () => {
	const question = await EventQuestion.create({
		eventId: new mongoose.Types.ObjectId(),
		studentId: users.mentor._id,
		question: "Stale admin check",
	});

	const forgedAdmin = tokenFor({
		_id: users.mentee1._id,
		role: "Admin",
		isAdmin: true,
		adminType: "head",
	});

	const response = await api(`/api/event-questions/${question._id}`, {
		method: "DELETE",
		token: forgedAdmin,
	});

	assert.equal(response.status, 403);
	assert.ok(await EventQuestion.findById(question._id), "question must still exist");
});

test("auth reload rejects blocked accounts and deleted users (D7)", async () => {
	const blocked = await makeUser("blocked", {
		name: "Regression Blocked",
		email: "blocked@regression.test",
		role: "alumni",
		blocked: true,
	});
	const blockedResponse = await api("/api/users/me", {
		token: tokenFor(blocked),
	});
	assert.equal(blockedResponse.status, 403);

	const deleted = await makeUser("deleted", {
		name: "Regression Deleted",
		email: "deleted@regression.test",
		role: "alumni",
	});
	const deletedToken = tokenFor(deleted);
	await User.findByIdAndDelete(deleted._id);

	const deletedResponse = await api("/api/users/me", {
		token: deletedToken,
	});
	assert.equal(deletedResponse.status, 401);
});


