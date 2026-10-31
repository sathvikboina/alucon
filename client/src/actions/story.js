import axios from "axios";
import { setAlert } from "./alert";
import { GET_STORIES, STORY_ERROR, UPDATE_LIKES, REMOVE_STORY } from "./types";

// Add story
export const addStory = (data) => async (dispatch) => {
	try {
		await axios.post(
			`${process.env.REACT_APP_BACKEND_URL}/api/stories`,
			data
		);

		dispatch(setAlert("Story posted successfully", "success"));
	} catch (err) {
		dispatch({
			type: STORY_ERROR,
			payload: {
				msg: err.response?.statusText || "Error",
				status: err.response?.status,
			},
		});
	}
};

// Get Stories (paginated)
export const getStories = (page = 1) => async (dispatch) => {
	try {
		const res = await axios.get(
			`${process.env.REACT_APP_BACKEND_URL}/api/stories?page=${page}`
		);

		dispatch({
			type: GET_STORIES,
			payload: res.data,
		});
	} catch (err) {
		dispatch({
			type: STORY_ERROR,
			payload: {
				msg: err.response?.statusText || "Error",
				status: err.response?.status,
			},
		});
	}
};

// Like Story
export const likeStory = (id) => async (dispatch) => {
	try {
		const res = await axios.put(
			`${process.env.REACT_APP_BACKEND_URL}/api/stories/like/${id}`
		);

		dispatch({
			type: UPDATE_LIKES,
			payload: { id, likes: res.data },
		});
	} catch (err) {
		dispatch({
			type: STORY_ERROR,
			payload: {
				msg: err.response?.statusText || "Error",
				status: err.response?.status,
			},
		});
	}
};

// Unlike Story
export const unlikeStory = (id) => async (dispatch) => {
	try {
		const res = await axios.put(
			`${process.env.REACT_APP_BACKEND_URL}/api/stories/unlike/${id}`
		);

		dispatch({
			type: UPDATE_LIKES,
			payload: { id, likes: res.data },
		});
	} catch (err) {
		dispatch({
			type: STORY_ERROR,
			payload: {
				msg: err.response?.statusText || "Error",
				status: err.response?.status,
			},
		});
	}
};

// Delete Story (creator only)
export const deleteStory = (id) => async (dispatch) => {
	try {
		await axios.delete(
			`${process.env.REACT_APP_BACKEND_URL}/api/stories/${id}`
		);

		dispatch({
			type: REMOVE_STORY,
			payload: id,
		});

		dispatch(setAlert("Story deleted", "success"));
	} catch (err) {
		dispatch({
			type: STORY_ERROR,
			payload: {
				msg: err.response?.statusText || "Error",
				status: err.response?.status,
			},
		});
	}
};