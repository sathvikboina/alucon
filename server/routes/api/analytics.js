const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const User = require("../../models/User");

// Middleware to check if user is head admin
const isHeadAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || !user.isAdmin || user.adminType !== "head") {
            return res.status(403).json({ msg: "Access denied. Head Admin only." });
        }
        next();
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

// @route   GET api/analytics/demographics
// @desc    Get user distribution by role
// @access  Private/HeadAdmin
router.get("/demographics", [auth, isHeadAdmin], async (req, res) => {
    try {
        const userRoles = await User.aggregate([
            {
                $group: {
                    _id: "$role",
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    name: "$_id",
                    value: "$count",
                    _id: 0
                }
            }
        ]);

        // Handle potentially null/empty roles
        const formattedData = userRoles.map(role => ({
            name: role.name ? role.name.charAt(0).toUpperCase() + role.name.slice(1) : "Unknown",
            value: role.value
        }));

        res.json(formattedData);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// @route   GET api/analytics/registrations
// @desc    Get user registrations over time
// @access  Private/HeadAdmin
router.get("/registrations", [auth, isHeadAdmin], async (req, res) => {
    try {
        const registrations = await User.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: "$date" },
                        month: { $month: "$date" }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1 }
            }
        ]);

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const formattedData = registrations.map(reg => ({
            name: `${months[reg._id.month - 1]} ${reg._id.year}`,
            users: reg.count
        }));

        res.json(formattedData);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// @route   GET api/analytics/members
// @desc    Get all members with join date
// @access  Private/HeadAdmin
router.get("/members", [auth, isHeadAdmin], async (req, res) => {
  try {
    const users = await User.find()
      .select("name email role date")
      .sort({ date: -1 }); // latest first

    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;