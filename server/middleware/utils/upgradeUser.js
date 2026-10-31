const User = require("../models/User");
const schedule = require("node-schedule");

schedule.scheduleJob("*/3 * * * * *", async () => {
	// console.log("job running");
	try{
		const users = await User.find();
		console.log(users.length);
	}
	catch(err){
		console.log(err);
	}
	const users = await User.find();
	console.log(users.length);
	// for (var i = 0; i < users.length; i++) {
	// 	var user = users[i];
	// 	if (
	// 		user.role === "student" &&
	// 		user.passing_year <= new Date().getFullYear()
	// 	) {
	// 		user.role = "alumni";
	// 		await user.save();
	// 	}
	// }
});

// upgradeUser();
// module.exports = upgradeUser;