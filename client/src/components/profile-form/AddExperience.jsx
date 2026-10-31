import React, { useState } from "react";
import { connect } from "react-redux";
import { Link, withRouter } from "react-router-dom";
import PropTypes from "prop-types";
import { addExperience } from "../../actions/users";

const AddExperience = ({ addExperience, history }) => {
	const [formInput, setFormInput] = useState({
		company: "",
		title: "",
		location: "",
		from: "",
		to: "",
		current: false,
		description: "",
	});

	const [toDateDisabled, toggleSwitch] = useState(false);

	const {
		company,
		location,
		title,
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
		addExperience(formInput, history);
	};

	return (
		<React.Fragment>
			<div className="profile-form-container">
				<div className="form-header">
					<h1 className="large text-primary">Add Experience</h1>
					<p style={{ color: "red" }}>* = required field</p>
				</div>
				<form className="form" onSubmit={onSubmit}>
					<div className="form-group">
						<label htmlFor="title">
							Job Title <span style={{ color: "red" }}>*</span>
						</label>
						<input
							type="text"
							id="title"
							name="title"
							placeholder="e.g. Software Developer"
							value={title}
							onChange={onChange}
							required
							aria-required="true"
						/>
					</div>

					<div className="form-group">
						<label htmlFor="company">
							Company <span style={{ color: "red" }}>*</span>
						</label>
						<input
							type="text"
							id="company"
							name="company"
							placeholder="e.g. Google, Infosys..."
							value={company}
							onChange={onChange}
							required
							aria-required="true"
						/>
					</div>

					<div className="form-group">
						<label htmlFor="location">Location</label>
						<input
							type="text"
							id="location"
							name="location"
							placeholder="e.g. Bangalore, India"
							value={location}
							onChange={onChange}
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
							aria-required="true"
						/>
					</div>

					<div className="form-group checkbox-inline">
						<label htmlFor="current">Current Job</label>
						<input
							type="checkbox"
							id="current"
							name="current"
							checked={current}
							onChange={() => {
								setFormInput({
									...formInput,
									current: !current,
								});
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
							rows="5"
							style={{
								width: "100%",
								padding: "1em",
								outline: "none",
							}}
							placeholder="Details about your work, responsibilities, or achievements"
							value={description}
							onChange={onChange}
						/>
					</div>

					<div className="back-submit-buttons">
						<Link
							className="btn btn-light my-1"
							to="/userprofile"
							style={{ width: "40%" }}
						>
							Go Back
						</Link>
						<input
							type="submit"
							className="btn btn-primary my-1"
							style={{ width: "40%" }}
							value="Add Experience"
						/>
					</div>
				</form>
			</div>
		</React.Fragment>
	);
};

AddExperience.propTypes = {
	addExperience: PropTypes.func.isRequired,
};

export default connect(null, { addExperience })(withRouter(AddExperience));
