const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verify the token, then replace role/admin claims with the current values
// from the database. A demoted admin must lose access immediately instead of
// keeping privileges until the token expires.
module.exports = async function (req, res, next) {
  // get token from header
  const token = req.header("x-auth-token");

  // check if no token
  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET
    );

    const dbUser = await User.findById(decoded.user.id)
      .select("isAdmin adminType role blocked")
      .lean();

    if (!dbUser) {
      return res.status(401).json({ msg: "Token is not Valid" });
    }

    if (dbUser.blocked) {
      return res.status(403).json({ msg: "Account is blocked" });
    }

    req.user = {
      ...decoded.user,
      role: dbUser.role,
      isAdmin: Boolean(dbUser.isAdmin),
      adminType: dbUser.adminType,
    };
    next();
  } catch (error) {
    res.status(401).json({ msg: "Token is not Valid" });
  }
};
