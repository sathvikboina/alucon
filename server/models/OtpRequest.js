const mongoose = require("mongoose");

// Short-lived registration / password-reset OTP records. Stored in MongoDB
// rather than process memory so verification works across serverless
// instances. The hashed password and submitted profile data live only until
// the OTP expires or is consumed.
const otpRequestSchema = new mongoose.Schema(
	{
		email: { type: String, required: true, unique: true, index: true },
		otpHash: { type: String, required: true },
		data: { type: mongoose.Schema.Types.Mixed, default: null },
		decoy: { type: Boolean, default: false },
		attempts: { type: Number, default: 0 },
		expiresAt: { type: Date, required: true },
	},
	{ timestamps: true }
);

// MongoDB removes expired documents automatically (runs about once a minute).
otpRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("OtpRequest", otpRequestSchema);
