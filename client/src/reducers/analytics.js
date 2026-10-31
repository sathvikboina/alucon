import {
  GET_ANALYTICS_DEMOGRAPHICS,
  GET_ANALYTICS_REGISTRATIONS,
  ANALYTICS_ERROR,
} from "../actions/types";

const initialState = {
  demographics: [],
  registrations: [],
  members: [],
  loadingDemographics: true,
  loadingRegistrations: true,
  error: {},
};

const analyticsReducer = (state = initialState, action) => {
  const { type, payload } = action;

  switch (type) {
    case GET_ANALYTICS_DEMOGRAPHICS:
      return {
        ...state,
        demographics: payload,
        loadingDemographics: false,
      };

    case GET_ANALYTICS_REGISTRATIONS:
      return {
        ...state,
        registrations: payload,
        loadingRegistrations: false,
      };

    case ANALYTICS_ERROR:
      return {
        ...state,
        error: payload,
        loadingDemographics: false,
        loadingRegistrations: false,
      };

    case "GET_ANALYTICS_MEMBERS":
      return {
        ...state,
        members: payload,
        loadingDemographics: false,
        loadingRegistrations: false,
      };

    default:
      return state;
  }
};

export default analyticsReducer;