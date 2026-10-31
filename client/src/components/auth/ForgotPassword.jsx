import React, { useEffect, useState } from "react";
import { withRouter } from "react-router-dom";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { closeSideNav } from "../../actions/alert";
import { forgotPassword } from '../../actions/auth';

const ForgotPassword = ({ closeSideNav, history, forgotPassword }) => {
	useEffect(() => {
		closeSideNav();
	}, [closeSideNav]);

	const [formInput, setFormInput] = useState({ email: "" });
	const [submitted, setSubmitted] = useState(false);
	const [loading, setLoading] = useState(false);

	const { email } = formInput;

	const onChange = (e) =>
		setFormInput({ ...formInput, [e.target.name]: e.target.value });

	const onSubmit = (e) => {
		e.preventDefault();
		setLoading(true);
		forgotPassword(formInput).then(link => {
			setLoading(false);
			setSubmitted(true);
		}).catch(err => {
			setLoading(false);
			console.log(err);
		});
	};

	if (submitted) {
		return (
			<div className="form-container">
				<div style={{
					textAlign: "center",
					padding: "2.5rem 1.5rem",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: "1rem",
				}}>
					{/* Icon */}
					<div style={{
						width: "70px", height: "70px", borderRadius: "50%",
						background: "#dcfce7", display: "flex",
						alignItems: "center", justifyContent: "center",
						fontSize: "2rem",
					}}>
						✉️
					</div>

					<h3 style={{ margin: 0, color: "#0f1f3d", fontSize: "1.4rem" }}>
						Check your inbox
					</h3>

					<p style={{ color: "#4b5563", fontSize: "0.95rem", maxWidth: "320px", lineHeight: 1.6, margin: 0 }}>
						We've sent a password reset link to <strong>{email}</strong>.
						Check your spam folder if you don't see it.
					</p>

					<div style={{
						background: "#f0fdf4",
						border: "1px solid #bbf7d0",
						borderRadius: "8px",
						padding: "0.75rem 1.25rem",
						color: "#15803d",
						fontSize: "0.88rem",
						width: "100%",
						boxSizing: "border-box",
					}}>
						✓ Reset link sent successfully
					</div>

					{/* <button
						onClick={() => { setSubmitted(false); setFormInput({ email: "" }); }}
						style={{
							marginTop: "0.5rem",
							background: "none",
							border: "none",
							color: "#6b7280",
							fontSize: "0.88rem",
							cursor: "pointer",
							textDecoration: "underline",
						}}
					>
						Use a different email
					</button> */}
				</div>
			</div>
		);
	}

	return (
		<div className="form-container">
			<h3>Forgot Password</h3>
			<p style={{ color: "blue" }}>
				Enter the email address associated with your account
			</p>

			<form className="form auth-form" onSubmit={onSubmit}>
				<div className="form-group">
					<input
						type="email"
						placeholder="Email address"
						name="email"
						value={email}
						autoComplete="true"
						onChange={onChange}
					/>
				</div>
				<input
					type="submit"
					className="btn btn-primary"
					value={loading ? "Sending…" : "Submit"}
					disabled={loading}
				/>
			</form>
		</div>
	);
};

ForgotPassword.propTypes = {
	closeSideNav: PropTypes.func.isRequired,
};

export default connect(null, { closeSideNav, forgotPassword })(withRouter(ForgotPassword));