import { configureStore } from "@reduxjs/toolkit";
import { composeWithDevTools } from "redux-devtools-extension";
import thunk from "redux-thunk";
import rootReducer from "./reducers";

const initialState = {};
const middleware = [thunk];

const store = configureStore({
	reducer: rootReducer,
	middleware: (getDefaultMiddleware) =>
	  getDefaultMiddleware().concat(thunk), // Ensure thunk is included
	devTools: process.env.NODE_ENV !== "production", // Enable Redux DevTools in dev mode
});

export default store;