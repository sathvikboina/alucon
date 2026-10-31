import axios from "axios";
import {
  GET_ANALYTICS_DEMOGRAPHICS,
  GET_ANALYTICS_REGISTRATIONS,
  ANALYTICS_ERROR,
} from "./types";

export const getDemographics = () => async (dispatch) => {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get("/api/analytics/demographics", {
      headers: {
        "x-auth-token": token,
      },
    });

    dispatch({
      type: GET_ANALYTICS_DEMOGRAPHICS,
      payload: res.data,
    });
  } catch (err) {
    dispatch({
      type: ANALYTICS_ERROR,
      payload: { msg: err.response.statusText, status: err.response.status },
    });
  }
};

export const getRegistrations = () => async (dispatch) => {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get("/api/analytics/registrations", {
      headers: {
        "x-auth-token": token,
      },
    });

    dispatch({
      type: GET_ANALYTICS_REGISTRATIONS,
      payload: res.data,
    });
  } catch (err) {
    dispatch({
      type: ANALYTICS_ERROR,
      payload: { msg: err.response.statusText, status: err.response.status },
    });
  }
};


export const getMembers = () => async (dispatch) => {
  try {
    const token = localStorage.getItem("token");

    const res = await axios.get("/api/analytics/members", {
      headers: {
        "x-auth-token": token,
      },
    });

    dispatch({
      type: "GET_ANALYTICS_MEMBERS",
      payload: res.data,
    });
  } catch (err) {
    dispatch({
      type: ANALYTICS_ERROR,
      payload: { msg: err.response?.statusText, status: err.response?.status },
    });
  }
};