import React from "react";
import PropTypes from "prop-types";
import { Route, Redirect } from "react-router-dom";
import { connect } from "react-redux";
import Spinner from "../layouts/Spinner";
import NotAuthorized from "../layouts/NotAuthorized";

const AdminRoute = ({
	component: Component,
	auth: { isAuthenticated, loadingAuth, authUser },
	...restProps
}) => {
	return (
		<Route
			{...restProps}
			render={(props) => {
				return !loadingAuth ? (
					isAuthenticated ? (
						authUser.isAdmin ? (
							<Component {...props} />
						) : (
							<NotAuthorized />
						)
					) : (
						<Redirect to="/login" />
					)
				) : (
					<Spinner />
				);
			}}
		/>
	);
};

AdminRoute.propTypes = {
	auth: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
	auth: state.auth,
});

export default connect(mapStateToProps)(AdminRoute);
