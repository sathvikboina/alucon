import { GET_STORIES, STORY_ERROR, UPDATE_LIKES, REMOVE_STORY } from "../actions/types";

const initialState = {
	stories: [],
	loading: true,
	error: {},
};

export default function(state = initialState, action) {
	const { type, payload } = action;

	switch (type) {
		case GET_STORIES:
			return {
				...state,
				stories: payload,
				loading: false,
			};
		case UPDATE_LIKES:
			return {
				...state,
				stories: state.stories.map((story) =>
					story._id === payload.id ? { ...story, likes: payload.likes } : story
				),
				loading: false,
			};
		case REMOVE_STORY:
			return {
				...state,
				stories: state.stories.filter((story) => story._id !== payload),
				loading: false,
			};
		case STORY_ERROR:
			return {
				...state,
				error: payload,
				loading: false,
			};
		default:
			return state;
	}
}