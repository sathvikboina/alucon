const crypto = require("crypto");
const aes256 = require("aes256");
require("dotenv").config();

const key = process.env.ENCRYPTION_KEY;

if (!key) {
	console.error("ENCRYPTION_KEY is not set in .env");
	process.exit(1);
}

// New messages use AES-256-GCM so tampering is detected. The old AES-256-CTR
// cipher is kept only to read messages written before this migration.
const legacyCipher = aes256.createCipher(key);
const keyBuffer = crypto.createHash("sha256").update(String(key)).digest();
const PREFIX = "gcm:v1:";
const IV_BYTES = 12;

exports.DoEncrypt = (text) => {
	if (!text || typeof text !== "string") return text;
	try {
		const iv = crypto.randomBytes(IV_BYTES);
		const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer, iv);
		const encrypted = Buffer.concat([
			cipher.update(text, "utf8"),
			cipher.final(),
		]);
		const tag = cipher.getAuthTag();
		return (
			PREFIX +
			[
				iv.toString("base64"),
				tag.toString("base64"),
				encrypted.toString("base64"),
			].join(":")
		);
	} catch (err) {
		console.error("Encryption error:", err.message);
		return text;
	}
};

exports.DoDecrypt = (text) => {
	if (!text || typeof text !== "string") return text;

	// Legacy AES-256-CTR values have no prefix.
	if (!text.startsWith(PREFIX)) {
		try {
			return legacyCipher.decrypt(text);
		} catch (err) {
			// Plaintext or otherwise unreadable: return as-is.
			return text;
		}
	}

	try {
		const [ivB64, tagB64, dataB64] = text.slice(PREFIX.length).split(":");
		if (!ivB64 || !tagB64 || !dataB64) return text;

		const decipher = crypto.createDecipheriv(
			"aes-256-gcm",
			keyBuffer,
			Buffer.from(ivB64, "base64")
		);
		decipher.setAuthTag(Buffer.from(tagB64, "base64"));
		const decrypted = Buffer.concat([
			decipher.update(Buffer.from(dataB64, "base64")),
			decipher.final(),
		]);
		return decrypted.toString("utf8");
	} catch (err) {
		// Authentication failure or malformed payload: do not expose bytes.
		return text;
	}
};
