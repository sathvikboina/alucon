process.env.ENCRYPTION_KEY = "encryption-regression-test-key";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const aes256 = require("aes256");
const { DoEncrypt, DoDecrypt } = require("../utils/encryption");

test("AES-256-GCM round-trips messages", () => {
	const plaintext = "Hello, this is a private message.";
	const encrypted = DoEncrypt(plaintext);

	assert.notEqual(encrypted, plaintext);
	assert.ok(encrypted.startsWith("gcm:v1:"));
	assert.equal(DoDecrypt(encrypted), plaintext);
});

test("AES-256-GCM detects tampering", () => {
	const encrypted = DoEncrypt("tamper me");
	const parts = encrypted.split(":");
	// Flip a byte in the ciphertext payload.
	const payload = Buffer.from(parts[4], "base64");
	payload[0] ^= 0xff;
	parts[4] = payload.toString("base64");

	assert.equal(DoDecrypt(parts.join(":")), parts.join(":"));
});

test("legacy AES-256-CTR messages still decrypt", () => {
	const legacy = aes256
		.createCipher(process.env.ENCRYPTION_KEY)
		.encrypt("legacy message");

	assert.equal(DoDecrypt(legacy), "legacy message");
});
