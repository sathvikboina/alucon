import {
	GET_JOIN_REQUESTS,
	JOIN_REQUESTS_ERROR,
	APPROVE_JOIN_REQUEST,
	APPROVE_JOIN_REQUEST_ERROR,
	CREATE_JOIN_REQUEST,
	REJECT_JOIN_REQUEST,
	REJECT_JOIN_REQUEST_ERROR,
	CLEAR_REQUESTS,
} from "../actions/types";

const initialState = {
	loading: true,
	joinRequests: [],
	error: {},
};

export default function requestReducer(state = initialState, action) {
	const { type, payload } = action;

	switch (type) {
		case GET_JOIN_REQUESTS:
			return {
				...state,
				joinRequests: payload,
				loading: false,
			};
		case JOIN_REQUESTS_ERROR:
			return {
				...state,
				error: payload,
				loading: false,
			};
		case CREATE_JOIN_REQUEST:
			return {
				...state,
				joinRequests: [...state.joinRequests, payload],
				loading: false,
			};
		case APPROVE_JOIN_REQUEST:
			return {
				...state,
				joinRequests: state.joinRequests.filter(
					(joinReq) => joinReq._id !== payload.id
				),
				loading: false,
			};
		case REJECT_JOIN_REQUEST:
			return {
				...state,
				joinRequests: state.joinRequests.filter(
					(joinReq) => joinReq._id !== payload.id
				),
				loading: false,
			};
		case APPROVE_JOIN_REQUEST_ERROR:
			return {
				...state,
				error: payload,
				loading: false,
			};
		case REJECT_JOIN_REQUEST_ERROR:
			return {
				...state,
				error: payload,
				loading: false,
			};
		case CLEAR_REQUESTS:
			return {
				...state,
				joinRequests: null,
			};
		default:
			return state;
	}
}
