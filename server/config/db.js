const mongoose = require("mongoose");

// Reuse one connection across warm serverless invocations instead of opening a
// new pool per request. Locally the same promise simply resolves once.
let connectionPromise = null;

// mongoose.connect() returns a promise
const connectDB = async () => {
	if (mongoose.connection.readyState === 1) return mongoose.connection;
	if (connectionPromise) return connectionPromise;

	connectionPromise = mongoose
		.connect(process.env.MONGO_URI || process.env.mongoURI_PROD)
		.then(() => {
			console.log("MongoDb connected");
			return mongoose.connection;
		})
		.catch((error) => {
			// A serverless function must return an error instead of terminating the
			// process: the platform reuses the process for later invocations.
			connectionPromise = null;
			console.error("[mongo] connection failed:", error.message);
			throw error;
		});

	return connectionPromise;
};

module.exports = connectDB;
