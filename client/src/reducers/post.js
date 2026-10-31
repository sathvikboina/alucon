import {
	GET_POSTS,
	GET_POST,
	POST_ERROR,
	TOGGLE_LIKE,
	TOGGLE_DISLIKE,
	DELETE_POST,
	CREATE_POST,
	ADD_COMMENT,
	CLEAR_POSTS,
	SET_POST_SETTING,
	GET_POST_SETTING,
	REMOVE_COMMENT,
} from "../actions/types";

const initialState = {
	posts: [],
	post: null,
	loading: true,
	error: {},
	settings: {
		requireApproval: null,
	},
};

export default function postReducer(state = initialState, action) {
	const { type, payload } = action;

	switch (type) {
		case GET_POSTS:
			return {
				...state,
				posts: payload,
				loading: false,
			};
		case GET_POST:
			return {
				...state,
				post: payload,
				loading: false,
			};
		case POST_ERROR:
			return {
				...state,
				error: payload,
				loading: false,
			};
		case TOGGLE_LIKE:
			return {
				...state,
				posts: state.posts.map((post) =>
					post._id === payload.id
						? {
								...post,
								likes: payload.likes,
								dislikes: payload.dislikes,
						  }
						: post
				),
				loading: false,
			};
		case TOGGLE_DISLIKE:
			return {
				...state,
				posts: state.posts.map((post) =>
					post._id === payload.id
						? {
								...post,
								likes: payload.likes,
								dislikes: payload.dislikes,
						  }
						: post
				),
				loading: false,
			};
		case DELETE_POST:
			return {
				...state,
				posts: state.posts.filter((post) => post._id !== payload),
				loading: false,
			};
		case ADD_COMMENT:
			return {
				...state,
				post: {
					...state.post,
					comments: payload,
				},
			};
		case CREATE_POST:
			return {
				...state,
				posts: [...state.posts, payload],
				loading: false,
			};
		case CLEAR_POSTS:
			return {
				...state,
				posts: null,
				post: null,
				loading: false,
			};
		case SET_POST_SETTING:
			console.log("inside reducers  set setting");
			return {
				...state,
				settings: { ...state.settings, requireApproval: payload },
				loading: false,
			};
		case GET_POST_SETTING:
			return {
				...state,
				settings: { ...state.settings, requireApproval: payload },
				loading: false,
			};

		case REMOVE_COMMENT:
			return {
				...state,
				post: {
					...state.post,
					comments: state.post.comments.filter(
						(x) => x._id !== payload
					),
				},
			};
		default:
			return state;
	}
}
