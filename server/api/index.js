// Vercel entry point. The Express app is reused across warm invocations; only
// the Mongo connection is awaited before a request is handled.
const connectDB = require("../config/db");
const app = require("../server");

module.exports = async (req, res) => {
	try {
		await connectDB();
	} catch (err) {
		res.status(503).json({ msg: "Database unavailable" });
		return;
	}
	return app(req, res);
};
