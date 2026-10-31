import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { Link, withRouter } from "react-router-dom";
import { closeSideNav } from "../../actions/alert";
import { resetPassword, verifyResetLink } from "../../actions/auth";
import PropTypes from "prop-types";

const ResetPassword = ({
	closeSideNav,
	resetPassword,
	verifyResetLink,
	match,
	history,
}) => {
	useEffect(() => {
		closeSideNav();
		verifyResetLink(match.params.user_id, match.params.reset_token);
	}, []);

	const [formInput, setFormInput] = useState({
		password: "",
		password_confirm: "",
	});

	const { password, password_confirm } = formInput;

	const onChange = (e) =>
		setFormInput({ ...formInput, [e.target.name]: e.target.value });

	const onSubmit = async (e) => {
		e.preventDefault();
		await resetPassword(formInput, match.params.user_id, match.params.reset_token);
		setTimeout(() => {
			history.push('/login');
		}, 1500);
	};

	return (
		<div className="form-container">
			<h3 className="mb-5">Reset Password</h3>

			<form
				className="form auth-form"
				action="create-profile.html"
				onSubmit={(e) => onSubmit(e)}
			>
				<div className="form-group">
					<input
						type="password"
						placeholder="Enter New Password"
						name="password"
						value={password}
						autoComplete="true"
						onChange={(event) => onChange(event)}
						minLength="6"
					/>
				</div>
				<div className="form-group">
					<input
						type="password"
						placeholder="Confirm New Password"
						name="password_confirm"
						value={password_confirm}
						autoComplete="true"
						onChange={(event) => onChange(event)}
						minLength="6"
					/>
				</div>
				<input
					type="submit"
					className="btn btn-primary"
					value="Reset"
				/>
			</form>
			<p className="my-1">
				Already have an account ? <Link to="/login">Login</Link>
			</p>
		</div>
	);
};

ResetPassword.propTypes = {
	resetPassword: PropTypes.func.isRequired,
	match: PropTypes.object.isRequired,
	history: PropTypes.object.isRequired,
	closeSideNav: PropTypes.func.isRequired,
	verifyResetLink: PropTypes.func.isRequired,
};

export default connect(null, { closeSideNav, resetPassword, verifyResetLink })(
	withRouter(ResetPassword)
);
