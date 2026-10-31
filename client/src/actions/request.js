import axios from "axios";
import { setAlert } from "./alert";
import {
	JOIN_REQUESTS_ERROR,
	GET_JOIN_REQUESTS,
	GET_POST_REQUESTS,
	POST_REQUESTS_ERROR,
	APPROVE_JOIN_REQUEST,
	APPROVE_JOIN_REQUEST_ERROR,
	REJECT_JOIN_REQUEST,
	REJECT_JOIN_REQUEST_ERROR,
	APPROVE_POST_REQUEST,
	APPROVE_POST_REQUEST_ERROR,
	REJECT_POST_REQUEST,
	REJECT_POST_REQUEST_ERROR,
} from "./types";

export const getJoinRequests = () => async (dispatch) => {
	try {
		const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/requests/join`);
		dispatch({
			type: GET_JOIN_REQUESTS,
			payload: res.data,
		});
	} catch (err) {
		dispatch({
			type: JOIN_REQUESTS_ERROR,
			payload: {
				msg: err.response.statusText,
				status: err.response.status,
			},
		});
	}
};

export const getPostRequests = () => async (dispatch) => {
	try {
		const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/requests/post`);
		dispatch({
			type: GET_POST_REQUESTS,
			payload: res.data,
		});
	} catch (err) {
		dispatch({
			type: POST_REQUESTS_ERROR,
			payload: {
				msg: err.response.statusText,
				status: err.response.status,
			},
		});
	}
};

// export const approveJoinRequest = (requestId) => async (dispatch) => {
//   try {
//     const config = {
//       headers: {
//         Authorization: `Bearer ${localStorage.token}`, // ✅ important
//       },
//     };

//     const res = await axios.get(
//       `${process.env.REACT_APP_BACKEND_URL}/api/requests/join/${requestId}/approve`,
//       config
//     );

//     console.log(res);
//     console.log("inside actions file of approve join request");

//     dispatch({
//       type: APPROVE_JOIN_REQUEST,
//       payload: res.data,
//     });
//   } catch (err) {
//     console.error(err); // add this for debugging

//     dispatch(setAlert("Approve Request Error", "danger"));
//     dispatch({
//       type: APPROVE_JOIN_REQUEST_ERROR,
//       payload: {
//         msg: err.response?.statusText,
//         status: err.response?.status,
//       },
//     });
//   }
// };

// export const approveJoinRequest = (requestId) => async (dispatch) => {
// 	try {
		
// 		const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/requests/join/${requestId}/approve`);
// 		console.log(res)
// 		console.log("inside actions file of approve join request");
// 		dispatch({
// 			type: APPROVE_JOIN_REQUEST,
// 			payload: res.data,
// 		});
// 	} catch (err) {
// 		dispatch(setAlert("Approve Request Error", "danger"));
// 		dispatch({
// 			type: APPROVE_JOIN_REQUEST_ERROR,
// 			payload: {
// 				msg: err.response.statusText,
// 				status: err.response.status,
// 			},
// 		});
// 	}
// };

export const approveJoinRequest = (requestId) => async (dispatch) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.token}`,
      },
    };

    const res = await axios.get(
      `/api/requests/join/${requestId}/approve`,
      config
    );

    console.log("🔥 APPROVE CALLED", res);

    dispatch({
      type: APPROVE_JOIN_REQUEST,
      payload: res.data,
    });
  } catch (err) {
    console.error("❌ ERROR:", err);

    dispatch(setAlert("Approve Request Error", "danger"));
  }
};


export const rejectJoinRequest = (requestId) => async (dispatch) => {
	try {
		const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/requests/join/${requestId}/reject`);
		dispatch({
			type: REJECT_JOIN_REQUEST,
			payload: res.data,
		});
	} catch (err) {
		dispatch(setAlert("Decline Request Error", "danger"));
		dispatch({
			type: REJECT_JOIN_REQUEST_ERROR,
			payload: {
				msg: err.response.statusText,
				status: err.response.status,
			},
		});
	}
};

export const approvePostRequest = (requestId) => async (dispatch) => {
	try {
		const res = await axios.get(`api/requests/post/${requestId}/approve`);
		dispatch({
			type: APPROVE_POST_REQUEST,
			payload: res.data
		})
	} catch (err) {
		dispatch(setAlert("Approve Post Error", "danger"));
		dispatch({
			type: APPROVE_POST_REQUEST_ERROR,
			payload: {
				msg: err.response.statusText,
				status: err.response.status,
			},
		});
	}
};

export const rejectPostRequest = (requestId) => async (dispatch) => {
	try {
		const res = await axios.get(`api/requests/post/${requestId}/reject`);
		dispatch({
			type: REJECT_POST_REQUEST,
			payload: res.data
		})
	} catch (err) {
		dispatch(setAlert("Reject Post Error", "danger"));
		dispatch({
			type: REJECT_POST_REQUEST_ERROR,
			payload: {
				msg: err.response.statusText,
				status: err.response.status,
			},
		});
	}
};
