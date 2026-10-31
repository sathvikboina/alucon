import {
	SET_ALERT,
	REMOVE_ALERT,
	OPEN_SIDE_NAV,
	CLOSE_SIDE_NAV,
} from "../actions/types";

const initialState = {
	alerts: [],
	sideNavOpen: false,
};

export default function alertReducer(state = initialState, action) {
	const { type, payload } = action;
	switch (type) {
		case SET_ALERT:
			return {
				...state,
				alerts: [...state.alerts, payload],
			};
		case REMOVE_ALERT:
			return {
				...state,
				alerts: state.alerts.filter((alt) => alt.id !== payload),
			};
		case OPEN_SIDE_NAV:
			return {
				...state,
				sideNavOpen: true,
			};
		case CLOSE_SIDE_NAV:
			return {
				...state,
				sideNavOpen: false,
			};
		default:
			return state;
	}
}
