import React, { useState } from "react";
import { Link, withRouter } from "react-router-dom";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { createProfile } from "../../actions/users";

const CreateProfile = ({ createProfile, history }) => {
	const [formInput, setFormInput] = useState({
		company: "",
		website: "",
		location: "",
		status: "",
		skills: "",
		githubusername: "",
		bio: "",
		twitter: "",
		facebook: "",
		linkedin: "",
		youtube: "",
		instagram: "",
	});

	const [displaySocialInputs, toggleSocialInputs] = useState(false);

	const {
		company,
		website,
		location,
		status,
		skills,
		githubusername,
		bio,
		twitter,
		facebook,
		linkedin,
		youtube,
		instagram,
	} = formInput;

	const onChange = (e) => {
		setFormInput({ ...formInput, [e.target.name]: e.target.value });
	};

	const onSubmit = (e) => {
		e.preventDefault();
		createProfile(formInput, history);
	};

	return (
		<React.Fragment>
			<div className="profile-form-container">
				<div className="form-header">
					<h1 className="large text-primary">Create your Profile</h1>
					<p style={{ color: "red" }}>* = required field</p>
				</div>

				<form className="form" onSubmit={onSubmit}>
					<div className="form-group">
						<label htmlFor="status">
							Professional Status <span style={{ color: "red" }}>*</span>
						</label>
						<select
							style={{ width: "100%" }}
							name="status"
							id="status"
							value={status}
							required
							onChange={onChange}
						>
							<option value="" disabled>
								Select your status
							</option>
							<option value="Developer">Developer</option>
							<option value="Junior Developer">Junior Developer</option>
							<option value="Senior Developer">Senior Developer</option>
							<option value="Student">Student</option>
							<option value="Intern">Intern</option>
							<option value="Instructor">Instructor/Teacher</option>
							<option value="Other">Other</option>
						</select>
						<small className="form-text">Tell us about your career</small>
					</div>

					<div className="form-group">
						<label htmlFor="company">Company</label>
						<input
							type="text"
							name="company"
							id="company"
							placeholder="Company"
							value={company}
							onChange={onChange}
						/>
						<small className="form-text">Could be your own company</small>
					</div>

					<div className="form-group">
						<label htmlFor="website">Website</label>
						<input
							type="text"
							placeholder="Website"
							name="website"
							id="website"
							value={website}
							onChange={onChange}
						/>
						<small className="form-text">Could be your own or a company website</small>
					</div>

					<div className="form-group">
						<label htmlFor="location">Location</label>
						<input
							type="text"
							name="location"
							id="location"
							placeholder="Location"
							value={location}
							onChange={onChange}
						/>
						<small className="form-text">City & state suggested (e.g. Boston, MA)</small>
					</div>

					<div className="form-group">
						<label htmlFor="skills">
							Skills <span style={{ color: "red" }}>*</span>
						</label>
						<input
							type="text"
							placeholder="Skills (comma separated)"
							name="skills"
							id="skills"
							required
							value={skills}
							onChange={onChange}
						/>
						<small className="form-text">
							Please use comma separated values (e.g. HTML,CSS,JavaScript)
						</small>
					</div>

					<div className="form-group">
						<label htmlFor="githubusername">GitHub Username</label>
						<input
							type="text"
							placeholder="GitHub Username"
							name="githubusername"
							id="githubusername"
							value={githubusername}
							onChange={onChange}
						/>
						<small className="form-text">
							If you want your latest repos and a GitHub link, include your username
						</small>
					</div>

					<div className="form-group">
						<label htmlFor="bio">Bio</label>
						<textarea
							rows="6"
							style={{ padding: "0.5em", outline: "none", width: "100%" }}
							placeholder="A short bio of yourself"
							name="bio"
							id="bio"
							value={bio}
							onChange={onChange}
						/>
						<small className="form-text">Tell us a little about yourself</small>
					</div>

					<div className="mr-2 my-4">
						<button
							onClick={() => toggleSocialInputs(!displaySocialInputs)}
							type="button"
							className="btn btn-light mr-2"
						>
							Add Social Network Links
						</button>
						<span className="mt-1" style={{ color: "blue" }}>
							*Optional
						</span>
					</div>

					{displaySocialInputs && (
						<React.Fragment>
							<div className="form-group social-input">
								<i className="fab fa-twitter fa-2x" />
								<input
									type="text"
									placeholder="Twitter URL"
									name="twitter"
									value={twitter}
									onChange={onChange}
								/>
							</div>

							<div className="form-group social-input">
								<i className="fab fa-facebook fa-2x" />
								<input
									type="text"
									placeholder="Facebook URL"
									name="facebook"
									value={facebook}
									onChange={onChange}
								/>
							</div>

							<div className="form-group social-input">
								<i className="fab fa-youtube fa-2x" />
								<input
									type="text"
									placeholder="YouTube URL"
									name="youtube"
									value={youtube}
									onChange={onChange}
								/>
							</div>

							<div className="form-group social-input">
								<i className="fab fa-linkedin fa-2x" />
								<input
									type="text"
									placeholder="LinkedIn URL"
									name="linkedin"
									value={linkedin}
									onChange={onChange}
								/>
							</div>

							<div className="form-group social-input">
								<i className="fab fa-instagram fa-2x" />
								<input
									type="text"
									placeholder="Instagram URL"
									name="instagram"
									value={instagram}
									onChange={onChange}
								/>
							</div>
						</React.Fragment>
					)}

					<div className="back-submit-buttons">
						<Link className="btn btn-light my-1" to="/userprofile" style={{ width: "40%" }}>
							Go Back
						</Link>
						<input
							type="submit"
							className="btn btn-primary my-1"
							style={{ width: "40%" }}
							value="Submit"
						/>
					</div>
				</form>
			</div>
		</React.Fragment>
	);
};

CreateProfile.propTypes = {
	createProfile: PropTypes.func.isRequired,
};

export default connect(null, { createProfile })(withRouter(CreateProfile));
