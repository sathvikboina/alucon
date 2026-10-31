const express = require('express')
const {linkedInCallback , getUser} = require("../../middleware/LinkedinAuth.js")

const Authroutes = express.Router()

// Authroutes.get("/auth/linkedin", passport.authenticate("linkedin", { scope: ["r_liteprofile", "r_emailaddress"] }));
Authroutes.get('/callback' , linkedInCallback)
Authroutes.get('/get-user' , getUser);

module.exports = Authroutes;
