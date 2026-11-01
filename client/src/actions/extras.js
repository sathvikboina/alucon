import axios from "axios";
import { setAlert } from "./alert";
import {
	GET_FEEDBACKS,
	FEEDBACK_ERROR,
	DELETE_FEEDBACK,
	DELETE_ALL_FEEDBACKS,
} from "./types";

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
