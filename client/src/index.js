import React from "react";
// import ReactDOM from "react-dom";
import axios from "axios";
import App from "./App";
import { createRoot } from "react-dom/client";

// The API is a separate Vercel project, so every relative axios call must be
// resolved against it. Several components call axios("/api/...") directly
// instead of using the configured instance in utils/api.js; without this
// default those calls hit the static client host and receive index.html.
const backendUrl = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
if (backendUrl) axios.defaults.baseURL = backendUrl;

const container = document.getElementById("root");
const root = createRoot(container);

root.render(<App />);

// ReactDOM.render(
// 	<React.StrictMode>
// 		<App />
// 	</React.StrictMode>,
// 	document.getElementById("root")
// );

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
