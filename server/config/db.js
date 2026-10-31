const mongoose = require("mongoose");

// mongoose.connect() returns a promise
const connectDB = async () => {
	try {
		// await mongoose.connect(process.env.mongoURI_PROD, {
        //     //these three below are adde to avoid some warnings in the terminal
		// 	useNewUrlParser: true,
		// 	useUnifiedTopology: true,
		// 	useCreateIndex: true,
		// 	useFindAndModify: false
		// });
		 await mongoose.connect(process.env.MONGO_URI || process.env.mongoURI_PROD);
		console.log("MongoDb connected");
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
};

module.exports = connectDB;
