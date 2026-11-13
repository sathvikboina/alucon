const jwt = require("jsonwebtoken");
const User = require('../models/User');

module.exports = async function (req, res, next) {
	// get token from header
	const token = req.header("x-auth-token");

	// check if no token
	if (!token) {
		return res.status(401).json({ msg: "No token, authorization denied" });
	}

	try {
		const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET);
		const thisUser = await User.findById(decoded.user.id).select(
			"isAdmin adminType role blocked"
		);

		if (!thisUser) {
			return res.status(401).json({ msg: "Token is not Valid" });
		}

		if (thisUser.blocked) {
			return res.status(403).json({ msg: "Account is blocked" });
		}

		if (!thisUser.isAdmin || thisUser.adminType !== "head") {
			return res
				.status(401)
				.json({ msg: "You are not authorised to perform this action" });
		}

		req.user = {
			...decoded.user,
			role: thisUser.role,
			isAdmin: Boolean(thisUser.isAdmin),
			adminType: thisUser.adminType,
		};
		next();
	} catch (error) {
		res.status(401).json({ msg: "Token is not Valid" });
	}
};
