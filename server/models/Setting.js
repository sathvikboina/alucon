const mongoose = require("mongoose");

const SettingSchema = new mongoose.Schema({
	requirePostApproval: {
		type: Boolean,
        required: true
	},
});

const pp = mongoose.model("Setting", SettingSchema);

// const mod = async() =>{
// 	const data = await new pp({
// 		requirePostApproval : true
// 	})
// 	const rr = await data.save();
// }

// mod();

module.exports = pp;
