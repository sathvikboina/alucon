import { combineReducers } from "redux";
import alert from "./alert";
import auth from "./auth";
import request from "./request";
import post from "./post";
import user from "./users";
import extras from "./extras";
import chat from "./chat";
import story from "./story"
import analytics from "./analytics";


export default combineReducers({ alert, auth, request, post, user, extras, chat , story, analytics });