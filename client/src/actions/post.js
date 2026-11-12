import axios from "axios";
import {
	GET_POSTS,
	POST_ERROR,
	GET_POST,
	TOGGLE_LIKE,
	TOGGLE_DISLIKE,
	LIKE_ERROR,
	DISLIKE_ERROR,
	DELETE_POST,
	CREATE_POST,
	REMOVE_COMMENT,
	ADD_COMMENT,
} from "./types";
import { setAlert } from "./alert";
// get posts
export const getPosts = (query, channel_name) => async (dispatch) => {
	try {
		const params = { query, channel_name};
		const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/posts/search`, { params });
		dispatch({
			type: GET_POSTS,
			payload: res.data,
		});
	} catch (err) {
		dispatch({
			type: POST_ERROR,
			payload: {
				msg: err.response.statusText,
				status: err.response.status,
			},
		});
	}
};

// like/un-like a post
// export const toggleLike = (post_id) => async (dispatch) => {
// 	try {
// 		const res = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/posts/${post_id}/likes`);
// 		dispatch({
// 			type: TOGGLE_LIKE,
// 			payload: res.data,
// 		});
// 	} catch (err) {
// 		console.log(err);
// 		dispatch({
// 			type: LIKE_ERROR,
// 			payload: {
// 				msg: err.response?.statusText,
// 				status: err.response.status,
// 			},
// 		});
// 	}
// };

export const toggleLike = (post_id) => async (dispatch) => {
  try {
   const config = {
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
};
    const res = await axios.post(
      `${process.env.REACT_APP_BACKEND_URL}/api/posts/${post_id}/likes`,
      {},
      config
    );

    dispatch({
      type: TOGGLE_LIKE,
      payload: res.data,
    });
  } catch (err) {
    console.error("LIKE ERROR:", err.response?.data);

    dispatch({
      type: LIKE_ERROR,
      payload: {
        msg: err.response?.statusText,
        status: err.response?.status,
      },
    });
  }
};
export const toggleDisLike = (post_id) => async (dispatch) => {
	try {
		const res = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/posts/${post_id}/dislikes`);
		dispatch({
			type: TOGGLE_DISLIKE,
			payload: res.data,
		});
	} catch (err) {
		dispatch({
			type: DISLIKE_ERROR,
			payload: {
				msg: err.response?.statusText,
				status: err.response.status,
			},
		});
	}
};

export const getPost = (post_id) => async (dispatch) => {
	try {
		const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/posts/${post_id}`);
		dispatch({
			type: GET_POST,
			payload: res.data,
		});
	} catch (err) {
		console.error(err);
		dispatch({
			type: POST_ERROR,
			payload: {
				msg: err.response?.statusText,
				status: err.response.status,
			},
		});
	}
};

export const deletePost = (post_id) => async (dispatch) => {
	try {
		await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/posts/${post_id}`);
		dispatch({
			type: DELETE_POST,
			payload: post_id,
		});

		dispatch(setAlert("Post Removed", "safe"));
	} catch (err) {
		dispatch({
			type: POST_ERROR,
			payload: {
				msg: err.response?.statusText,
				status: err.response.status,
			},
		});
	}
};

export const createPost = (formData) => async (dispatch) => {
	const config = {
		headers: {
			"Content-Type": "application/json",
		},
	};

	try {
		const res = await axios.post(
			`${process.env.REACT_APP_BACKEND_URL}/api/posts/create-post`,
			formData,
			config
		);
		dispatch({
			type: CREATE_POST,
			payload: res.data,
		});


		dispatch(setAlert("Post created", "safe"));
		return 1;
	} catch (err) {
		console.error(err.response);
		const errors = err.response.data.errors;
		if (errors) {
			errors.forEach((e) => {
				dispatch(setAlert(e.msg, "danger"));
			});
		}

		dispatch({
			type: POST_ERROR,
			payload: {
				msg: err.response?.statusText,
				status: err.response.status,
			},
		});
		return 0;
	}
};

export const addComment = (post_id, formData) => async (dispatch) => {
	try {
		const res = await axios.post(
			`${process.env.REACT_APP_BACKEND_URL}/api/posts/${post_id}/comments`,
			formData
		);

		dispatch({
			type: ADD_COMMENT,
			payload: res.data,
		});

		dispatch(setAlert("Comment Added", "safe"));
		return 1;
	} catch (err) {
		const errors = err.response.data.errors;
		if (errors) {
			errors.forEach((err) => {
				dispatch(setAlert(err.msg, "danger"));
			});
		}

		dispatch({
			type: POST_ERROR,
			payload: {
				msg: err.response?.statusText,
				status: err.response.status,
			},
		});
		return 0;
	}
};

export const deleteComment = (postId, commentId) => async (dispatch) => {
	try {
		await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/posts/${postId}/comments/${commentId}`);

		dispatch({
			type: REMOVE_COMMENT,
			payload: commentId,
		});

		dispatch(setAlert("Comment Removed", "safe"));
	} catch (err) {
		dispatch({
			type: POST_ERROR,
			payload: {
				msg: err.response?.statusText,
				status: err.response.status,
			},
		});
	}
};
