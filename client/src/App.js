import React, { useEffect } from "react";
import {
	BrowserRouter as Router,
	Route,
	Switch,
	useLocation,
} from "react-router-dom";
import { connect } from "react-redux";

import Home from "./components/layouts/Home";
import Navbar from "./components/layouts/Navbar.jsx";
import AppSidebar from "./components/layouts/AppSidebar";
import { loadUser } from "./actions/auth";
import { Provider } from "react-redux";
import store from "./store";
import "./App.css";
import setAuthToken from "./utils/setAuthToken";
import Routes from "./components/routing/Routes";
import Footer from "./components/layouts/Footer";
import InstitutionalShowcase from "./pages/InstitutionalShowcase";
import GalleryPage from "./pages/GalleryPage";
import AdminShowcase from "./pages/AdminShowcase";
import AdminRoute from "./components/routing/AdminRoute";

if (localStorage.token) {
	setAuthToken(localStorage.token);
}

const PUBLIC_PREFIXES = [
	"/login",
	"/register",
	"/forgotPassword",
	"/resetPassword",
	"/showcase",
	"/gallery",
	"/admin/showcase",
];

// Admin tools already have a dedicated sidebar; keeping the global rail too
// would leave two navigation columns on the same screen.
const OWN_SIDEBAR_PREFIXES = ["/dashboard", "/analytics"];

const AppShell = ({ isAuthenticated, children }) => {
	const location = useLocation();
	const path = location.pathname;
	const isPublic =
		path === "/" || PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
	const hasOwnSidebar = OWN_SIDEBAR_PREFIXES.some((prefix) =>
		path.startsWith(prefix)
	);
	const showSidebar = isAuthenticated && !isPublic && !hasOwnSidebar;
	const hideFooter = path.startsWith("/messenger");

	return (
		<div className={`app-shell${showSidebar ? " has-sidebar" : ""}`}>
			{showSidebar && <AppSidebar />}
			<div className="app-main">
				{children}
				{!hideFooter && <Footer />}
			</div>
		</div>
	);
};

const ConnectedShell = connect((state) => ({
	isAuthenticated: state.auth.isAuthenticated,
}))(AppShell);

const App = () => {
	useEffect(() => {
		store.dispatch(loadUser());
	}, []);

	return (
		<Provider store={store}>
			<Router>
				<Navbar />

				<ConnectedShell>
					<Switch>
						<Route exact path="/" component={Home} />
						<Route exact path="/showcase" component={InstitutionalShowcase} />
						<Route exact path="/gallery" component={GalleryPage} />
						<AdminRoute exact path="/admin/showcase" component={AdminShowcase} />

						<Route component={Routes} />
					</Switch>
				</ConnectedShell>
			</Router>
		</Provider>
	);
};

export default App;
