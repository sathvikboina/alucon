import axios from "axios";
// import dotenv, { config } from "dotenv";
import { setAlert } from "./alert";
import setAuthToken from "../utils/setAuthToken";
import {
	REGISTER_SUCCESS,
	REGISTER_FAIL,
	USER_LOADED,
	AUTH_ERROR,
	LOGIN_SUCCESS,
	LOGIN_FAIL,
	LOG_OUT,
	CLEAR_USER,
	CLEAR_USERS,
	CLEAR_POSTS,
	CLEAR_REQUESTS,
} from "./types";

// dotenv.config();
// Load user
export const loadUser = () => async (dispatch) => {
	const token = localStorage.getItem("token");

	// If no token, do not call backend
	if (!token) {
		dispatch({ type: AUTH_ERROR });
		return;
	}

	// Set token in header
	setAuthToken(token);

	try {
		const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/auth`);
		dispatch({
			type: USER_LOADED,
			payload: res.data,
		});
	} catch (error) {
		dispatch({ type: AUTH_ERROR });
	}
};

// export const loadUser = () => async (dispatch) => {
// 	if (localStorage.token) {
// 		setAuthToken(localStorage.token);
// 	}
// 	try {
// 		const res = await axios.get(`/api/auth`);
// 		dispatch({
// 			type: USER_LOADED,
// 			payload: res.data,
// 		});
// 	} catch (error) {
// 		console.log(error," inside client actions auth.js loadUser");
// 		dispatch({
// 			type: AUTH_ERROR,
// 		});
// 	}
// };

// Login
export const login =
	({ email, password }) =>
	async (dispatch) => {
		const config = {
			headers: {
				"Content-Type": "application/json",
			},
		};

		const body = JSON.stringify({ email, password });
		try {
			const res = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/auth`, body, config);
			console.log("login details :- " , res);
			localStorage.setItem("_user_data" , JSON.stringify(res.data.user_data));

			dispatch({
    type: LOGIN_SUCCESS,
    payload: res.data.token,
});

dispatch(loadUser());


		} catch (e) {
			console.log(e.response);
			const errors = e?.response?.data?.errors;
			if (errors) {
				errors.forEach((err) => {
					dispatch(setAlert(err.msg, "danger"));
				});
			}
			dispatch({
				type: LOGIN_FAIL,
			});
		}
	};

//Register user
export const register =
	({
		name,
		email,
		password,
		role,
		program,
		starting_year,
		passing_year,
		designation,
		organisation,
		location,
		department,
		working_area,
	}) =>
	async (dispatch) => {
		const config = {
			headers: {
				"Content-Type": "application/json",
			},
		};

		let body = null;
		if (role === "student") {
			body = JSON.stringify({
				name,
				email,
				password,
				role,
				program,
				starting_year,
				passing_year,
			});
		} else if (role === "alumni") {
			body = JSON.stringify({
				name,
				email,
				password,
				role,
				program,
				starting_year,
				passing_year,
				organisation,
				designation,
				working_area,
				location,
			});
		} else if (role === "faculty") {
			body = JSON.stringify({
				name,
				email,
				password,
				role,
				department,
				designation,
			});
		}
		try {
			const res = await axios.post(`/api/users/register`, body, config);
			console.log("register details :- " , res.data?.savedRequest);
			dispatch({
				type: REGISTER_SUCCESS,
				payload: res.data?.savedRequest,
			});
			dispatch(setAlert("Verify OTP to send join request to Admin", "success"));
			// dispatch(loadUser());
			return true;
		} catch (e) {
			const errors = e?.response?.data?.errors;
			if (errors) {
				errors.forEach((err) => {
					dispatch(setAlert(err.msg, "danger"));
				});
			}
			console.log(e," inside client actions auth.js register");
			dispatch({
				type: REGISTER_FAIL,
			});
			return false;
		}
	};

export const forgotPassword = (formData) => async (dispatch) => {
	const config = {
		headers: {
			"Content-Type": "application/json",
		},
	};
	try {
		await axios.post(
			`${process.env.REACT_APP_BACKEND_URL}/api/auth/forgot-password`,
			formData,
			config
		);

		dispatch(setAlert("Check your email for Reset Link", "safe"));
	} catch (e) {
		const errors = e.response.data.errors;
		if (errors) {
			errors.forEach((err) => {
				dispatch(setAlert(err.msg, "danger"));
			});
		}
	}
};
export const resetPassword = (formInput, user_id, reset_token) => async (dispatch) => {
	const config = {
		headers: {
			"Content-Type": "application/json",
		},
	};

	const { password, password_confirm } = formInput;
	const body = { password, password_confirm, user_id, reset_token };
	try {
		await axios.post(
			`${process.env.REACT_APP_BACKEND_URL}/api/auth/reset-password`,
			body,
			config
		);
		dispatch(setAlert("Password changed", "safe"));
	} catch (e) {
		const errors = e.response.data.errors;
		if (errors) {
			errors.forEach((err) => {
				dispatch(setAlert(err.msg, "danger"));
			});
		}
	}
};

export const verifyResetLink = (user_id, reset_token) => async (dispatch) => {
	const config = {
		headers: {
			"Content-Type": "application/json",
		},
	};

	const body = { user_id, reset_token };

	try {
		await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/auth/verify-reset-link`, body, config);
		return 1;
	} catch (e) {
		const errors = e.response.data.errors;
		if (errors) {
			errors.forEach((err) => {
				dispatch(setAlert(err.msg, "danger"));
			});
		}
		return 0;
	}
}

// log out
export const logOut = () => (dispatch) => {
	localStorage.setItem("_user_data" , "none");
	dispatch({ type: LOG_OUT });
	dispatch({ type: CLEAR_USER });
	dispatch({ type: CLEAR_USERS });
	dispatch({ type: CLEAR_POSTS });
	dispatch({ type: CLEAR_REQUESTS });
};
