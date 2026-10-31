import {
	GET_ACHIEVEMENTS,
	GET_FEEDBACKS,
	ACHIEVEMENT_ERROR,
	FEEDBACK_ERROR,
	DELETE_ACHIEVEMENT,
	DELETE_FEEDBACK,
	DELETE_ALL_ACHIVEMENTS,
	DELETE_ALL_FEEDBACKS,
	GET_CHANNELS,
	CHANNELS_ERROR,
	CREATE_CHANNEL,
} from "../actions/types";

const initialState = {
	feedbacks: [],
	achievements: [],
	channels: [],
	loading: true,
	error: {},
};

export default function extrasReducer(state = initialState, action) {
	const { type, payload } = action;

	switch (type) {
		case GET_ACHIEVEMENTS:
			return {
				...state,
				achievements: payload,
				loading: false,
			};
		case GET_FEEDBACKS:
			return {
				...state,
				feedbacks: payload,
				loading: false,
			};
		case FEEDBACK_ERROR:
		case ACHIEVEMENT_ERROR:
			return {
				...state,
				error: payload,
				loading: false,
			};
		case DELETE_FEEDBACK:
			return {
				...state,
				feedbacks: state.feedbacks.filter(
					(item) => item._id !== payload
				),
				loading: false,
			};
		case DELETE_ACHIEVEMENT:
			return {
				...state,
				achievements: state.achievements.filter(
					(item) => item._id !== payload
				),
				loading: false,
			};
		case GET_CHANNELS:
			return {
				...state,
				channels: payload,
				loading: false,
			};
		case CHANNELS_ERROR:
			return {
				...state,
				error: payload,
				loading: false,
			};
		case DELETE_ALL_ACHIVEMENTS:
			return {
				...state,
				achievements: [],
				loading: false,
			};
		case DELETE_ALL_FEEDBACKS:
			return {
				...state,
				feedbacks: [],
				loading: false,
			};
		default:
			return state;
	}
}
