import {
	GET_USERS,
	GET_USERS_ERROR,
	GET_USER,
	USER_ERROR,
	CLEAR_USER,
	CLEAR_USERS,
	MAKE_ADMIN,
	MAKE_ADMIN_ERROR,
	REMOVE_ADMIN,
	REMOVE_ADMIN_ERROR,
	BLOCK_USER,
	BLOCK_USER_ERROR,
	UNBLOCK_USER,
	UPDATE_USER,
	UNBLOCK_USER_ERROR,
	FOLLOW_USER,
	UNFOLLOW_USER,
} from "../actions/types";

const initialSate = {
	userProfile: null,
	users: [],
	loading: true,
	error: {},
};

export default function userReducer(state = initialSate, action) {
	const { type, payload } = action;
	switch (type) {
		case GET_USERS:
			return {
				...state,
				users: payload,
				loading: false,
			};
		case GET_USERS_ERROR:
			return {
				...state,
				loading: false,
				error: payload,
				users: [],
				userProfile: null,
			};
		case GET_USER:
		case UPDATE_USER:
			return {
				...state,
				userProfile: payload,
				loading: false,
			};
		case CLEAR_USER:
			return {
				...state,
				userProfile: null,
				loading: false,
			};
		case CLEAR_USERS:
			return {
				...state,
				users: null,
				loading: false,
			};
		case USER_ERROR:
			return {
				...state,
				error: payload,
				loading: false,
				users: [],
				userProfile: null,
			};
		case MAKE_ADMIN:
			return {
				...state,
				users: state.users.map((user_item) =>
					user_item._id === payload._id
						? {
								...user_item,
								isAdmin: payload.isAdmin,
								adminType: payload.adminType,
						  }
						: user_item
				),
			};
		case MAKE_ADMIN_ERROR:
		case REMOVE_ADMIN_ERROR:
		case BLOCK_USER_ERROR:
		case UNBLOCK_USER_ERROR:
			return {
				...state,
				error: payload,
				loading: false,
			};
		case REMOVE_ADMIN:
			return {
				...state,
				users: state.users.map((user_item) =>
					user_item._id === payload._id
						? {
								...user_item,
								isAdmin: payload.isAdmin,
								adminType: "",
						  }
						: user_item
				),
			};
		case BLOCK_USER:
		case UNBLOCK_USER:
			return {
				...state,
				users: state.users.map((user_item) =>
					user_item._id === payload._id
						? {
								...user_item,
								blocked: payload.blocked,
						  }
						: user_item
				),
			};
		case FOLLOW_USER:
			return {
				...state,
				userProfile: { ...state.userProfile, followers: payload.followers },
				loading: false,
			};
		case UNFOLLOW_USER:
			return {
				...state,
				userProfile: { ...state.userProfile, followers: payload.followers },
				loading: false,
			};
		default:
			return state;
	}
}
