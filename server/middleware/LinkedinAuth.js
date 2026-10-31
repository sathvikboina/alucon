const User = require("../models/User.js");
const jwt = require("jsonwebtoken");
require("dotenv").config(); // Ensure environment variables are loaded

// Get Access Token from LinkedIn
const getAccessToken = async (code) => {
    const body = new URLSearchParams({
        grant_type: "authorization_code", // Fixed typo
        code: code,
        client_id: process.env.LINKEDIN_CLIENT_ID, // Using environment variable
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI, // Fixed hardcoded URL
    });

    const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
    });

    if (!response.ok) {
        throw new Error(response.statusText);
    }

    const accessToken = await response.json();
    return accessToken;
};

// Get User Data from LinkedIn
const getUserData = async (accessToken) => {
    const response = await fetch("https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(response.statusText);
    }

    const userData = await response.json();
    return userData;
};

// LinkedIn Callback Function
const linkedInCallback = async (req, res) => {
    try {
        const { code } = req.query;

        // Get access token
        const accessToken = await getAccessToken(code);
        const userData = await getUserData(accessToken.access_token);

        if (!userData) {
            return res.status(500).json({
                success: false,
                error: "Failed to fetch user data",
            });
        }

        // Find user in database
        let user = await User.findOne({ linkedinId: userData.id });

        // If user does not exist, create a new one
        if (!user) {
            user = new User({
                linkedinId: userData.id,
                name: `${userData.localizedFirstName} ${userData.localizedLastName}`,
                email: userData.email || "not_available@linkedin.com",
                avatar: userData.profilePicture?.["displayImage~"]?.elements[0]?.identifiers[0]?.identifier || "",
            });

            await user.save();
        }

        // Generate JWT token
        const token = jwt.sign(
            { name: user.name, email: user.email, avatar: user.avatar },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        // Set cookie with token
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
        });

        // Redirect user to frontend
        res.redirect("http://localhost:5173/login");

    } catch (error) {
        console.error("LinkedIn Authentication Error:", error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

// Get Logged-In User
const getUser = async (req, res) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(403).json({
                success: false,
                message: "No authentication token found",
            });
        }

        const userData = jwt.verify(token, process.env.JWT_SECRET);

        res.status(200).json({
            success: true,
            user: userData,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Invalid or expired token",
        });
    }
};

module.exports = { linkedInCallback, getUser };
