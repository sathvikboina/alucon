import React, { useState } from "react";
import { connect } from "react-redux";
import { Link, withRouter } from "react-router-dom";
import PropTypes from "prop-types";
import { addEducation } from "../../actions/users";

const AddEducation = ({ addEducation, history }) => {
	const [formInput, setFormInput] = useState({
		school: "",
		degree: "",
		fieldofstudy: "",
		from: "",
		to: "",
		current: false,
		description: "",
	});

	const [toDateDisabled, toggleSwitch] = useState(false);
	const {
		school,
		degree,
		fieldofstudy,
		from,
		to,
		description,
		current,
	} = formInput;

	const onChange = (e) => {
		setFormInput({ ...formInput, [e.target.name]: e.target.value });
	};

	const onSubmit = (e) => {
		e.preventDefault();
		addEducation(formInput, history);
	};

	return (
		<React.Fragment>
			<div className="profile-form-container">
				<div className="form-header">
					<h1 className="large text-primary">Add Education</h1>
					<p style={{ color: "red" }}>* = required field</p>
				</div>
				<form className="form" onSubmit={onSubmit}>
					<div className="form-group">
						<label htmlFor="school">
							School / University / Institution <span style={{ color: "red" }}>*</span>
						</label>
						<input
							type="text"
							id="school"
							name="school"
							placeholder="Name of School / University / Institution"
							value={school}
							onChange={onChange}
							required
						/>
					</div>

					<div className="form-group">
						<label htmlFor="degree">
							Degree <span style={{ color: "red" }}>*</span>
						</label>
						<input
							type="text"
							id="degree"
							name="degree"
							placeholder="e.g. BTECH, MTECH..."
							value={degree}
							onChange={onChange}
							required
						/>
					</div>

					<div className="form-group">
						<label htmlFor="fieldofstudy">
							Field of Study <span style={{ color: "red" }}>*</span>
						</label>
						<input
							type="text"
							id="fieldofstudy"
							name="fieldofstudy"
							placeholder="e.g. IT, ECE..."
							value={fieldofstudy}
							onChange={onChange}
							required
						/>
					</div>

					<div className="form-group">
						<label htmlFor="from">
							From Date <span style={{ color: "red" }}>*</span>
						</label>
						<input
							type="date"
							id="from"
							name="from"
							value={from}
							onChange={onChange}
							required
						/>
					</div>

					<div className="form-group checkbox-inline">
						<label htmlFor="current">Current Study</label>
						<input
							type="checkbox"
							id="current"
							name="current"
							checked={current}
							onChange={() => {
								setFormInput({ ...formInput, current: !current });
								toggleSwitch(!toDateDisabled);
							}}
						/>
					</div>

					<div className="form-group">
						<label htmlFor="to">To Date</label>
						<input
							type="date"
							id="to"
							name="to"
							value={to}
							onChange={onChange}
							disabled={toDateDisabled ? "disabled" : ""}
						/>
					</div>

					<div className="form-group">
						<label htmlFor="description">Description</label>
						<textarea
							id="description"
							name="description"
							style={{ width: "100%", padding: "1em", outline: "none" }}
							rows="5"
							placeholder="Details about your education (optional)"
							value={description}
							onChange={onChange}
						/>
					</div>

					<div className="back-submit-buttons">
						<Link className="btn btn-light my-1" to="/userprofile" style={{ width: "40%" }}>
							Go Back
						</Link>
						<input
							type="submit"
							className="btn btn-primary my-1"
							style={{ width: "40%" }}
							value="Add Education"
						/>
					</div>
				</form>
			</div>
		</React.Fragment>
	);
};

AddEducation.propTypes = {
	addEducation: PropTypes.func.isRequired,
};

export default connect(null, { addEducation })(withRouter(AddEducation));
