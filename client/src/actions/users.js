import api from "../utils/api";
import { setAlert } from "./alert";
import {
	GET_USER,
	USER_ERROR,
	CLEAR_USER,
	UPDATE_USER,
	ACCOUNT_DELETED,
	GET_USERS,
	GET_REPOS,
	GET_USERS_ERROR,
	MAKE_ADMIN,
	REMOVE_ADMIN,
	MAKE_ADMIN_ERROR,
	REMOVE_ADMIN_ERROR,
	BLOCK_USER,
	BLOCK_USER_ERROR,
	UNBLOCK_USER,
	UNBLOCK_USER_ERROR,
	FOLLOW_USER,
	UNFOLLOW_USER,
} from "./types";

export const getCurrentUserProfile = () => async (dispatch) => {
	try {
		const res = await api.get("/api/users/me");
		dispatch({ type: GET_USER, payload: res.data });
	} catch (error) {
		dispatch({ type: CLEAR_USER });
		dispatch({
			type: USER_ERROR,
			payload: { msg: error.response.statusText, status: error.response.status },
		});
	}
};

export const createProfile =
	(formInput, history, edit = false) =>
	async (dispatch) => {
		try {
			const config = { headers: { "Content-Type": "application/json" } };
			const payload = { ...formInput, timages: formInput.images };
			const res = await api.post("/api/profile", payload, config);
			dispatch({ type: GET_USER, payload: res.data });
			dispatch(setAlert(edit ? "Profile Updated" : "Profile created", "safe"));
			if (!edit) {
				setTimeout(() => history.push("/userprofile"), 1500);
			}
		} catch (err) {
			const errors = err.response.data.errors;
			if (errors) {
				errors.forEach((e) => dispatch(setAlert(e.msg, "danger")));
			}
			dispatch({
				type: USER_ERROR,
				payload: { msg: err.response.statusText, status: err.response.status },
			});
		}
	};

export const addExperience = (formInput, history) => async (dispatch) => {
	try {
		const config = { headers: { "Content-Type": "application/json" } };
		const res = await api.put("/api/users/experience", formInput, config);
		dispatch({ type: UPDATE_USER, payload: res.data });
		dispatch(setAlert("Experience added", "safe"));
		setTimeout(() => history.push("/userprofile"), 1500);
	} catch (err) {
		const errors = err.response.data.errors;
		if (errors) {
			errors.forEach((e) => dispatch(setAlert(e.msg, "danger")));
		}
		dispatch({
			type: USER_ERROR,
			payload: { msg: err.response.statusText, status: err.response.status },
		});
	}
};

export const addEducation = (formInput, history) => async (dispatch) => {
	try {
		const config = { headers: { "Content-Type": "application/json" } };
		const res = await api.put("/api/users/education", formInput, config);
		dispatch({ type: UPDATE_USER, payload: res.data });
		dispatch(setAlert("Education added", "safe"));
		setTimeout(() => history.push("/userprofile"), 1500);
	} catch (err) {
		const errors = err.response.data.errors;
		if (errors) {
			errors.forEach((e) => dispatch(setAlert(e.msg, "danger")));
		}
		dispatch({
			type: USER_ERROR,
			payload: { msg: err.response.statusText, status: err.response.status },
		});
	}
};

export const deleteExperience = (id) => async (dispatch) => {
	try {
		const res = await api.delete(`/api/users/experience/${id}`);
		dispatch({ type: UPDATE_USER, payload: res.data });
		dispatch(setAlert("Experience Deleted", "safe"));
	} catch (err) {
		dispatch({
			type: USER_ERROR,
			payload: { msg: err.response.statusText, status: err.response.status },
		});
	}
};

export const deleteEducation = (id) => async (dispatch) => {
	try {
		const res = await api.delete(`/api/users/education/${id}`);
		dispatch({ type: UPDATE_USER, payload: res.data });
		dispatch(setAlert("Education Deleted", "safe"));
	} catch (err) {
		dispatch({
			type: USER_ERROR,
			payload: { msg: err.response.statusText, status: err.response.status },
		});
	}
};

export const deleteAccount = () => async (dispatch) => {
	if (window.confirm("Are you sure? This can NOT be undone!")) {
		try {
			await api.delete("/api/users");
			dispatch({ type: CLEAR_USER });
			dispatch({ type: ACCOUNT_DELETED });
			dispatch(setAlert("Account Deleted", "safe"));
		} catch (err) {
			dispatch({
				type: USER_ERROR,
				payload: { msg: err.response.statusText, status: err.response.status },
			});
		}
	}
};

export const getUserById = (userId) => async (dispatch) => {
	try {
		const res = await api.get(`/api/users/${userId}`);
		dispatch({ type: GET_USER, payload: res.data });
	} catch (err) {
		dispatch({
			type: USER_ERROR,
			payload: { msg: err.response.statusText, status: err.response.status },
		});
	}
};

export const getUsers = (searchTerm) => async (dispatch) => {
	dispatch({ type: CLEAR_USER });
	try {
		if (searchTerm === "") searchTerm = "all";
		const res = await api.get(`/api/users/search/${searchTerm}`);
		dispatch({ type: GET_USERS, payload: res.data });
	} catch (err) {
		dispatch({
			type: GET_USERS_ERROR,
			payload: { msg: err.response.statusText, status: err.response.status },
		});
	}
};

export const getGithubRepos = (username) => async (dispatch) => {
	try {
		const res = await api.get(`/api/users/github/${username}`);
		dispatch({ type: GET_REPOS, payload: res.data });
	} catch (err) {
		dispatch({
			type: USER_ERROR,
			payload: { msg: err.response.statusText, status: err.response.status },
		});
	}
};

export const makeAdmin = (user_id) => async (dispatch) => {
	try {
		const res = await api.get(`/api/users/${user_id}/make-admin`);
		dispatch({ type: MAKE_ADMIN, payload: res.data });
	} catch (err) {
		dispatch({
			type: MAKE_ADMIN_ERROR,
			payload: { msg: err.response.statusText, status: err.response.status },
		});
	}
};

export const removeAdmin = (user_id) => async (dispatch) => {
	try {
		const res = await api.get(`/api/users/${user_id}/remove-admin`);
		dispatch({ type: REMOVE_ADMIN, payload: res.data });
	} catch (err) {
		dispatch({
			type: REMOVE_ADMIN_ERROR,
			payload: { msg: err.response.statusText, status: err.response.status },
		});
	}
};

export const blockUser = (user_id) => async (dispatch) => {
	try {
		const res = await api.get(`/api/users/${user_id}/block`);
		dispatch({ type: BLOCK_USER, payload: res.data });
	} catch (err) {
		dispatch({
			type: BLOCK_USER_ERROR,
			payload: { msg: err.response.statusText, status: err.response.status },
		});
	}
};

export const unblockUser = (user_id) => async (dispatch) => {
	try {
		const res = await api.get(`/api/users/${user_id}/unblock`);
		dispatch({ type: UNBLOCK_USER, payload: res.data });
	} catch (err) {
		dispatch({
			type: UNBLOCK_USER_ERROR,
			payload: { msg: err.response.statusText, status: err.response.status },
		});
	}
};

export const followUser = (user_id) => async (dispatch) => {
	try {
		const res = await api.put(`/api/users/${user_id}/follow`);
		dispatch({ type: FOLLOW_USER, payload: res.data });
		return true;
	} catch (err) {
		console.log(err);
		return false;
	}
};

export const unFollowUser = (user_id) => async (dispatch) => {
	try {
		const res = await api.put(`/api/users/${user_id}/unfollow`);
		dispatch({ type: UNFOLLOW_USER, payload: res.data });
		return true;
	} catch (err) {
		console.log(err);
		return false;
	}
};

export const getUsersByType = (user_type) => async (dispatch) => {
	try {
		const res = await api.get(`/api/users/type/${user_type}`);
		return res.data;
	} catch (err) {
		console.log(err);
	}
};