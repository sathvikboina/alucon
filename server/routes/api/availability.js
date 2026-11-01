const express = require("express");
const router = express.Router();

const Doubt = require("../../models/Doubt");
const Resource = require("../../models/Resource");
const Alumni = require("../../models/Alumni");
const Research = require("../../models/Research");
const ShowcaseEvent = require("../../models/ShowcaseEvent");
const Infra = require("../../models/Infra");
const Story = require("../../models/Story");
const Achievement = require("../../models/Achievement");

// Public, cheap counts used by the navigation and the Showcase tabs so empty
// modules stay out of sight until there is enough content to demo.
router.get("/", async (req, res) => {
	try {
		const [
			doubts,
			resources,
			hallOfFame,
			research,
			events,
			infrastructure,
			stories,
			achievements,
		] = await Promise.all([
			Doubt.countDocuments(),
			Resource.countDocuments(),
			Alumni.countDocuments(),
			Research.countDocuments(),
			ShowcaseEvent.countDocuments(),
			Infra.countDocuments(),
			Story.countDocuments(),
			Achievement.countDocuments({ status: "approved" }),
		]);

		res.json({
			doubts,
			resources,
			showcase: hallOfFame + research + events + infrastructure,
			sections: {
				"hall-of-fame": hallOfFame,
				research,
				events,
				infrastructure,
				stories,
				achievements,
			},
		});
	} catch (err) {
		console.error("Error reading availability:", err.message);
		res.status(500).json({ msg: "Server Error in availability" });
	}
});

module.exports = router;
