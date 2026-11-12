import React, { useEffect } from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import Home from "./components/layouts/Home";
import Navbar from "./components/layouts/Navbar.jsx";
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

const App = () => {
	useEffect(() => {
		store.dispatch(loadUser());
	}, []);

	return (
		<Provider store={store}>
			<Router>
				<React.Fragment>
					<Navbar />

					<Switch>
						<Route exact path="/" component={Home} />
						<Route exact path="/showcase" component={InstitutionalShowcase} />
						<Route exact path="/gallery" component={GalleryPage} />
						<AdminRoute exact path="/admin/showcase" component={AdminShowcase} />

						<Route component={Routes} />
					</Switch>

					<Route
						render={({ location }) =>
							location.pathname.startsWith("/messenger") ? null : <Footer />
						}
					/>
				</React.Fragment>
			</Router>
		</Provider>
	);
};

export default App;