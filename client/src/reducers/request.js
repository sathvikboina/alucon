import {
	GET_JOIN_REQUESTS,
	GET_POST_REQUESTS,
	POST_REQUESTS_ERROR,
	JOIN_REQUESTS_ERROR,
	APPROVE_POST_REQUEST,
	APPROVE_JOIN_REQUEST,
	CREATE_POST_REQUEST,
	CREATE_JOIN_REQUEST,
	REJECT_JOIN_REQUEST,
	REJECT_POST_REQUEST,
	REJECT_JOIN_REQUEST_ERROR,
	REJECT_POST_REQUEST_ERROR,
	APPROVE_JOIN_REQUEST_ERROR,
	APPROVE_POST_REQUEST_ERROR,
	CLEAR_REQUESTS,
} from "../actions/types";

const initialState = {
	loading: true,
	joinRequests: [],
	postRequests: [],
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
		case GET_POST_REQUESTS:
			return {
				...state,
				postRequests: payload,
				loading: false,
			};
		case POST_REQUESTS_ERROR:
			return {
				...state,
				error: payload,
				loading: false,
			};
		case JOIN_REQUESTS_ERROR:
			return {
				...state,
				error: payload,
				loading: false,
			};
		case APPROVE_POST_REQUEST:
			return {
				...state,
				postRequests: state.postRequests.filter(
					(postRequest) => postRequest._id !== payload.id
				),
				loading: false,
			};
		case CREATE_POST_REQUEST:
			return {
				...state,
				postRequests: [...state.postRequests, payload],
				loading: false,
			};
		case CREATE_JOIN_REQUEST:
			return {
				...state,
				joinRequests: [...state.joinRequests, payload],
				loading: false,
			};
		case REJECT_POST_REQUEST:
			return {
				...state,
				postRequests: state.postRequests.filter(
					(postRequest) => postRequest._id !== payload.id
				),
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
		case REJECT_POST_REQUEST_ERROR:
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
		case APPROVE_JOIN_REQUEST_ERROR:
			return {
				...state,
				error: payload,
				loading: false,
			};
		case APPROVE_POST_REQUEST_ERROR:
			return {
				...state,
				error: payload,
				loading: false,
			};
		case CLEAR_REQUESTS:
			return {
				...state,
				joinRequests: null,
				postRequests: null,
			};
		default:
			return state;
	}
}
