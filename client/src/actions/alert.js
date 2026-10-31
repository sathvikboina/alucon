import { v4 as uuidv4 } from "uuid";
import {
	SET_ALERT,
	REMOVE_ALERT,
	OPEN_SIDE_NAV,
	CLOSE_SIDE_NAV,
} from "./types";

export const setAlert =
	(msg, alertType, timeout = 2150) =>
	(dispatch) => {
		const id = uuidv4();
		dispatch({
			type: SET_ALERT,
			payload: { msg, alertType, id },
		});

		setTimeout(
			() =>
				dispatch({
					type: REMOVE_ALERT,
					payload: id,
				}),
			timeout
		);
	};

export const openSideNav = () => (dispatch) => {
	dispatch({type: OPEN_SIDE_NAV})
};

export const closeSideNav = () => (dispatch) => {
	dispatch({type: CLOSE_SIDE_NAV})
};
