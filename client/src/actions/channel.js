import axios from "axios";
import { GET_CHANNELS, CHANNELS_ERROR } from "./types";
import { setAlert } from "./alert";

export const getAllChannels = () => async (dispatch) => {
    try {
        const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/channels/all`);
        dispatch({
            type: GET_CHANNELS,
            payload: res.data,
        });
    } catch (err) {
        dispatch({
            type: CHANNELS_ERROR,
            payload: {
                msg: err.response.statusText,
                status: err.response.status,
            },
        });
    }
};

export const createChannel = (new_channel_name) => async (dispatch) => {
	try {
		const config = {
			headers: {
				"Content-Type": "application/json",
			},
		};

		await axios.post(
			`${process.env.REACT_APP_BACKEND_URL}/api/channels/create-channel`,
			{
				new_channel_name,
			},
			config
		);
		dispatch(setAlert("Channel Created", "safe"));
	} catch (err) {
		console.log(err);
	}
};
