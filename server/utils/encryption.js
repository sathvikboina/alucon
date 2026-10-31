const aes256 = require("aes256");
require("dotenv").config();

const key = process.env.ENCRYPTION_KEY;

if (!key) {
	console.error("ENCRYPTION_KEY is not set in .env");
	process.exit(1);
}

// ✅ Fixed: createCipher takes the key once. Don't pass key again to encrypt/decrypt.
const cipher = aes256.createCipher(key);

exports.DoEncrypt = (text) => {
	if (!text) return text;
	try {
		return cipher.encrypt(text); // ✅ was: cipher.encrypt(key, text) — WRONG
	} catch (err) {
		console.error("Encryption error:", err.message);
		return text;
	}
};

exports.DoDecrypt = (text) => {
	if (!text) return text;
	try {
		return cipher.decrypt(text); // ✅ was: cipher.decrypt(key, text) — WRONG
	} catch (err) {
		// If decryption fails (e.g. legacy plaintext message), return as-is
		return text;
	}
};