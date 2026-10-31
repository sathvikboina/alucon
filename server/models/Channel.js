const mongoose = require("mongoose");

const ChannelSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	posts: {
		type: [String],
	},
});
const Channel = mongoose.model("channel", ChannelSchema);
const addChannel = async() =>{
			// const { new_channel_name } = "research";
			const channel = new Channel({ name: "Research" });
			const channelObj = await channel.save();
}
// addChannel();
module.exports = Channel;
