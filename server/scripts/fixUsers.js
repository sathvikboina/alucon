const mongoose = require("mongoose");
const User = require("../models/User"); // adjust the path if needed

require("dotenv").config();

const fixUsers = async () => {
	try {
		if (!process.env.MONGO_URI) {
			throw new Error("MONGO_URI is required to run this script");
		}
		await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        

		await User.updateMany(
			{ friends: { $exists: false } },
			{ $set: { friends: [] } }
		);

		await User.updateMany(
			{ blockedUsers: { $exists: false } },
			{ $set: { blockedUsers: [] } }
		);

		console.log("Users updated successfully ✅");
		process.exit(0);
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
};

fixUsers();
