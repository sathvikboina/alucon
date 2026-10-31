import axios from "axios";
import { setAlert } from "./alert";
import {
	GET_ACHIEVEMENTS,
	GET_FEEDBACKS,
	ACHIEVEMENT_ERROR,
	FEEDBACK_ERROR,
	DELETE_ACHIEVEMENT,
	DELETE_FEEDBACK,
	DELETE_ALL_ACHIVEMENTS,
	DELETE_ALL_FEEDBACKS,
} from "./types";

export const submitAchievement =
	(formInput, imgUrl, proofUrl) => async (dispatch) => {
		const config = {
			headers: {
				"Content-Type": "application/json",
			},
		};
		console.log("inside actions file");
		console.log(formInput);
		console.log(imgUrl);
		console.log(proofUrl);
		const data = {
			formInput,
			imgUrl,
			proofUrl,
		};
		try {
			await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/extras/add-achievement`, data, config);

			dispatch(setAlert("Submit Success", "safe"));
			return 1;
		} catch (err) {
			const errors = err.response.data.errors;

			if (errors) {
				errors.forEach((e) => {
					dispatch(setAlert(e.msg, "danger"));
				});
			}
			return 0;
		}
	};

export const submitFeedback = (formInput) => async (dispatch) => {
	const config = {
		headers: {
			"Content-Type": "application/json",
		},
	};

	try {
		await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/extras/submit-feedback`, formInput, config);
		dispatch(setAlert("Submit Success", "safe"));
		return 1;
	} catch (err) {
		const errors = err.response.data.errors;

		if (errors) {
			errors.forEach((e) => {
				dispatch(setAlert(e.msg, "danger"));
			});
			return 0;
		}
	}
};

export const getAchievements = () => async (dispatch) => {
	try {
		const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/extras/achievements`);
		dispatch({
			type: GET_ACHIEVEMENTS,
			payload: res.data,
		});
	} catch (err) {
		dispatch({
			type: ACHIEVEMENT_ERROR,
			payload: {
				msg: err.response.statusText,
				status: err.response.status,
			},
		});

		const errors = err.response.data.errors;

		if (errors) {
			errors.forEach((e) => {
				dispatch(setAlert(e.msg, "danger"));
			});
		}
	}
};

export const getFeedbacks = () => async (dispatch) => {
	try {
		const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/extras/feedbacks`);
		dispatch({
			type: GET_FEEDBACKS,
			payload: res.data,
		});
	} catch (err) {
		dispatch({
			type: FEEDBACK_ERROR,
			payload: {
				msg: err.response.statusText,
				status: err.response.status,
			},
		});

		const errors = err.response.data.errors;

		if (errors) {
			errors.forEach((e) => {
				dispatch(setAlert(e.msg, "danger"));
			});
		}
	}
};

export const deleteAchievement = (achievement_id) => async (dispatch) => {
	try {
		const res = await axios.delete(
			`${process.env.REACT_APP_BACKEND_URL}/api/extras/achievements/${achievement_id}`
		);
		dispatch({
			type: DELETE_ACHIEVEMENT,
			payload: res.data,
		});

		dispatch(setAlert("Achievement Removed", "safe"));
	} catch (err) {
		dispatch({
			type: ACHIEVEMENT_ERROR,
			payload: {
				msg: err.response.statusText,
				status: err.response.status,
			},
		});
	}
};

export const deleteFeedback = (feedback_id) => async (dispatch) => {
	try {
		await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/extras/feedbacks/${feedback_id}`);
		dispatch({
			type: DELETE_FEEDBACK,
			payload: feedback_id,
		});

		dispatch(setAlert("Feedback Removed", "safe"));
	} catch (err) {
		dispatch({
			type: FEEDBACK_ERROR,
			payload: {
				msg: err.response.statusText,
				status: err.response.status,
			},
		});
	}
};

export const deleteAllAchievements = () => async (dispatch) => {
	try {
		await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/extras/achievements/all`);
		dispatch({
			type: DELETE_ALL_ACHIVEMENTS,
		});
	} catch (err) {
		dispatch({
			type: ACHIEVEMENT_ERROR,
			payload: {
				msg: err.response.statusText,
				status: err.response.status,
			},
		});
	}
};

export const deleteAllFeedbacks = () => async (dispatch) => {
	try {
		await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/extras/feedbacks/all`);
		dispatch({
			type: DELETE_ALL_FEEDBACKS,
		});
	} catch (err) {
		dispatch({
			type: FEEDBACK_ERROR,
			payload: {
				msg: err.response.statusText,
				status: err.response.status,
			},
		});
	}
};
