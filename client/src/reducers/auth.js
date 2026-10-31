import {
	AUTH_ERROR,
	REGISTER_FAIL,
	REGISTER_SUCCESS,
	USER_LOADED,
	LOGIN_SUCCESS,
	LOGIN_FAIL,
	LOG_OUT,
	ACCOUNT_DELETED,
	FOLLOW_USER,
	UNFOLLOW_USER,
} from "../actions/types";

const initialState = {
	token: localStorage.getItem("token"),
	isAuthenticated: null,
	loadingAuth: true,
	authUser: null,
};

export default function authReducer(state = initialState, action) {
	const { type, payload } = action;
	switch (type) {
		case LOGIN_SUCCESS:
    localStorage.setItem("token", payload);
    return {
        ...state,
        token: payload,
        isAuthenticated: true,
        loadingAuth: false,
    };
	case REGISTER_SUCCESS:
    return {
        ...state,
        loadingAuth: false,
    };

		// case REGISTER_SUCCESS:
		// 	localStorage.setItem("token", payload);
		// 	return {
		// 		...state,
		// 		...payload,
		// 		isAuthenticated: true,
		// 		loadingAuth: false,
		// 		authUser: payload,
		// 	};
		case REGISTER_FAIL:
		case LOGIN_FAIL:
		case AUTH_ERROR:
		case LOG_OUT:
		case ACCOUNT_DELETED:
			localStorage.removeItem("token");
			return {
				...state,
				authUser: null,
				token: null,
				isAuthenticated: false,
				loadingAuth: false,
			};
		case USER_LOADED:
			return {
				...state,
				isAuthenticated: true,
				loadingAuth: false,
				authUser: payload,
			};
		case FOLLOW_USER:
		case UNFOLLOW_USER:
			return {
				...state,
				authUser: { ...state.authUser, followings: payload.followings },
				loading: false,
			};
		default:
			return state;
	}
}
