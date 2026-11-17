const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const MediaBlob = require("../../models/MediaBlob");

// @route   GET api/media/:id
// @desc    Serve an upload stored in MongoDB (deployments without Cloudinary)
// @access  Public — the unguessable ObjectId is the capability, like a CDN URL
router.get("/:id", async (req, res) => {
	try {
		if (!mongoose.isValidObjectId(req.params.id)) {
			return res.status(404).json({ msg: "Not found" });
		}

		const blob = await MediaBlob.findById(req.params.id).lean();
		if (!blob || !blob.data) {
			return res.status(404).json({ msg: "Not found" });
		}

		res.set("Content-Type", blob.mimetype || "application/octet-stream");
		res.set("Content-Length", String(blob.data.length));
		res.set("Cache-Control", "public, max-age=31536000, immutable");
		res.set("Content-Disposition", "inline");
		return res.send(blob.data);
	} catch (error) {
		console.error("[media] read failed:", error.message);
		return res.status(500).json({ msg: "Media unavailable" });
	}
});

module.exports = router;
