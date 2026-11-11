import React, { useState, useEffect } from "react";
import { Link, withRouter } from "react-router-dom";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { createProfile, getCurrentUserProfile } from "../../actions/users";
import api from '../../utils/api';

const EditProfile = ({
	createProfile,
	getCurrentUserProfile,
	auth: { loadingAuth, authUser },
	history,
}) => {
	let userData = localStorage.getItem("_user_data");
	userData = JSON.parse(userData);
	const userid = userData._id;
	const userRole = (authUser && authUser.role) || userData.role;
	const isAlumni = ["alumni", "faculty"].includes(String(userRole).toLowerCase());

	const [image, setImage] = useState("");
	const [isLoading, setIsLoading] = useState(true);

	const [formInput, setFormInput] = useState({
		organisation: "",
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
		userID: userid,
		images: [],
		// Matching preferences
		mentor_available: false,
		mentor_areas: "",
		mentor_capacity: 3,
		mentor_mode: "Remote",
		mentee_goals: "",
		internship_types: "",
		internship_work_modes: "",
		internship_locations: "",
	});

	const [displaySocialInputs, toggleSocialInputs] = useState(false);

	// Load existing profile data on component mount
	useEffect(() => {
		const loadProfile = async () => {
			try {
				const res = await api.get(`/api/users/${userid}`);
				const user = res.data;
				setFormInput({
					organisation: user.organisation || "",
					website: user.website || "",
					location: user.location || "",
					status: user.status || "",
					skills: Array.isArray(user.skills) ? user.skills.join(", ") : user.skills || "",
					githubusername: user.githubusername || "",
					bio: user.bio || "",
					twitter: (user.social && user.social.twitter) || "",
					facebook: (user.social && user.social.facebook) || "",
					linkedin: (user.social && user.social.linkedin) || "",
					youtube: (user.social && user.social.youtube) || "",
					instagram: (user.social && user.social.instagram) || "",
					userID: userid,
					images: user.images || [],
					mentor_available:
						user.mentorship?.available !== undefined
							? user.mentorship.available
							: false,
					mentor_areas: (user.mentorship?.areas || []).join(", "),
					mentor_capacity: user.mentorship?.capacity || 3,
					mentor_mode: user.mentorship?.mode || "Remote",
					mentee_goals: (user.mentee_goals || []).join(", "),
					internship_types: (user.internship_preferences?.types || []).join(", "),
					internship_work_modes: (user.internship_preferences?.work_modes || []).join(", "),
					internship_locations: (user.internship_preferences?.locations || []).join(", "),
				});
			} catch (err) {
				console.error("Failed to load profile", err);
			} finally {
				setIsLoading(false);
			}
		};
		loadProfile();
	}, [userid, isAlumni]);

	const {
		organisation,
		website,
		location,
		status,
		skills,
		githubusername,
		bio,
		mentor_available,
		mentor_areas,
		mentor_capacity,
		mentor_mode,
		mentee_goals,
		internship_types,
		internship_work_modes,
		internship_locations,
	} = formInput;

	const onChange = (e) => {
		const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
		setFormInput({ ...formInput, [e.target.name]: value });
	};

	// const onSubmit = async (e) => {
	// 	e.preventDefault();
	// 	const timages = [];
	// 	const config = {
	// 		headers: {
	// 			"Content-Type": "multipart/form-data",
	// 		},
	// 	};
	// 	if (image !== "") {
	// 		const formData1 = new FormData();
	// 		formData1.append("file", image);
	// 		const res1 = await axios.post(
	// 			`/upload-image`,
	// 			formData1,
	// 			config
	// 		);
	// 		timages.push(res1.data);
	// 		setFormInput({ ...formInput, images: timages });
	// 		createProfile(
	// 			{ ...formInput, images: timages },
	// 			history,
	// 			true
	// 		);
	// 	} else {
	// 		createProfile(formInput, history, true);
	// 	}
	// };
	// REPLACE the onSubmit function with this:
// const onSubmit = async (e) => {
//     e.preventDefault();
//     const timages = [];

//     if (image !== "") {
//         const config = { headers: { "Content-Type": "multipart/form-data" } };
//         const formData1 = new FormData();
//         formData1.append("file", image);

//         try {
//             const res1 = await axios.post("/api/upload", formData1, config);
//             timages.push(res1.data.url);  // ← was res1.data
//             createProfile({ ...formInput, images: timages }, history, true);
//         } catch (err) {
//             console.error("Image upload failed", err);
//         }
//     } else {
//         createProfile(formInput, history, true);
//     }
// };
	const onSubmit = async (e) => {
		e.preventDefault();
		const updatedForm = { ...formInput };

		if (image !== "") {
			try {
				const formData1 = new FormData();
				formData1.append("file", image);
				const res1 = await api.post("/api/upload", formData1);
				updatedForm.images = [res1.data.url];
				setFormInput(updatedForm);
				await createProfile(updatedForm, history, true);
			} catch (err) {
				console.error("Image upload failed", err);
			}
		} else {
			// No new image uploaded, keep existing images
			await createProfile(updatedForm, history, true);
		}
	};
	return (
		<React.Fragment>
			{isLoading ? (
				<div style={{ padding: "2rem", textAlign: "center" }}>Loading profile...</div>
			) : (
			<div className="profile-form-container">
				<div className="form-header">
					<h1 className="large text-primary">Edit your Profile</h1>
					<small style={{ color: "red" }}>* = required field</small>
				</div>
				<form className="form" onSubmit={onSubmit}>
					<div className="form-group">
						<label>Status <span style={{ color: "red" }}>*</span></label>
						<select
							style={{ width: "100%" }}
							name="status"
							value={status}
							required
							onChange={onChange}
						>
							<option value="">-- Select Status --</option>
							<option value="Developer">Developer</option>
							<option value="Junior Developer">Junior Developer</option>
							<option value="Senior Developer">Senior Developer</option>
							<option value="Student">Student</option>
							<option value="Intern">Intern</option>
							<option value="Instructor">Instructor/Teacher</option>
							<option value="Other">Other</option>
						</select>
					</div>
					<div className="form-group">
						<input
							type="text"
							name="organisation"
							placeholder="Organisation"
							value={organisation}
							onChange={onChange}
						/>
					</div>
					<div className="form-group">
						<input
							type="text"
							placeholder="Website"
							name="website"
							value={website}
							onChange={onChange}
						/>
					</div>
					<div className="form-group">
						<input
							type="text"
							name="location"
							placeholder="Location"
							value={location}
							onChange={onChange}
						/>
					</div>
					<div className="form-group">
						<label>Skills <span style={{ color: "red" }}>*</span></label>
						<input
							type="text"
							placeholder="HTML,CSS,JavaScript"
							name="skills"
							value={skills}
							onChange={onChange}
							required
						/>
					</div>

					{isAlumni ? (
						<div
							style={{
								border: "1px solid #dbe6f3",
								borderRadius: "10px",
								padding: "14px",
								marginBottom: "16px",
								background: "#f8fbff",
							}}
						>
							<h4 style={{ margin: "0 0 10px", fontSize: "14px", color: "#174a80" }}>
								Mentorship availability
							</h4>
							<label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", fontSize: "13px" }}>
								<input
									type="checkbox"
									name="mentor_available"
									checked={mentor_available}
									onChange={onChange}
								/>
								Open to mentoring students
							</label>
							<div className="form-group">
								<label>Mentoring areas</label>
								<input
									type="text"
									name="mentor_areas"
									placeholder="Career, Research, Higher Studies"
									value={mentor_areas}
									onChange={onChange}
								/>
								<small className="form-text">
									Comma separated. Options: Career, Research, Higher Studies,
									Entrepreneurship, Placements, Other.
								</small>
							</div>
							<div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
								<div className="form-group" style={{ flex: 1, minWidth: "140px" }}>
									<label>Mentee capacity</label>
									<input
										type="number"
										min="1"
										max="20"
										name="mentor_capacity"
										value={mentor_capacity}
										onChange={onChange}
									/>
								</div>
								<div className="form-group" style={{ flex: 1, minWidth: "140px" }}>
									<label>Preferred mode</label>
									<select name="mentor_mode" value={mentor_mode} onChange={onChange}>
										<option>Remote</option>
										<option>Hybrid</option>
										<option>In-person</option>
									</select>
								</div>
							</div>
						</div>
					) : (
						<div
							style={{
								border: "1px solid #dbe6f3",
								borderRadius: "10px",
								padding: "14px",
								marginBottom: "16px",
								background: "#f8fbff",
							}}
						>
							<h4 style={{ margin: "0 0 10px", fontSize: "14px", color: "#174a80" }}>
								Matching preferences
							</h4>
							<div className="form-group">
								<label>What do you want mentorship for?</label>
								<input
									type="text"
									name="mentee_goals"
									placeholder="Career, Placements"
									value={mentee_goals}
									onChange={onChange}
								/>
							</div>
							<div className="form-group">
								<label>Preferred internship types</label>
								<input
									type="text"
									name="internship_types"
									placeholder="Internship, Research, Referral"
									value={internship_types}
									onChange={onChange}
								/>
							</div>
							<div className="form-group">
								<label>Preferred work modes</label>
								<input
									type="text"
									name="internship_work_modes"
									placeholder="Remote, Hybrid"
									value={internship_work_modes}
									onChange={onChange}
								/>
							</div>
							<div className="form-group">
								<label>Preferred locations</label>
								<input
									type="text"
									name="internship_locations"
									placeholder="Bengaluru, Hyderabad, Remote"
									value={internship_locations}
									onChange={onChange}
								/>
							</div>
						</div>
					)}
					<div className="form-group">
						<input
							type="text"
							placeholder="Github Username"
							name="githubusername"
							value={githubusername}
							onChange={onChange}
						/>
					</div>
					<div className="form-group">
						<textarea
							rows="6"
							style={{ padding: "0.5em", outline: "none", width: "100%" }}
							placeholder="A short bio of yourself"
							name="bio"
							value={bio}
							onChange={onChange}
						/>
					</div>
					<div className="form-group">
						<label>Attach Image</label>
						<input
							type="file"
							accept="image/*"
							onChange={(e) => setImage(e.target.files[0])}
						/>
					</div>
					<div className="mr-2 my-4">
						<button
							onClick={() => toggleSocialInputs(!displaySocialInputs)}
							type="button"
							className="btn btn-light mr-2"
						>
							Add Social Network Links
						</button>
						<span className="mt-1" style={{ color: "blue" }}>*Optional</span>
					</div>
					{displaySocialInputs && (
						<React.Fragment>
							{["twitter", "facebook", "youtube", "linkedin", "instagram"].map((platform) => (
								<div className="form-group social-input" key={platform}>
									<i className={`fab fa-${platform} fa-2x`} />
									<input
										type="text"
										placeholder={`${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`}
										name={platform}
										value={formInput[platform]}
										onChange={onChange}
									/>
								</div>
							))}
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
							value="Update Profile"
						/>
					</div>
				</form>
			</div>
			)}
		</React.Fragment>
	);
};

EditProfile.propTypes = {
	createProfile: PropTypes.func.isRequired,
	getCurrentUserProfile: PropTypes.func.isRequired,
	auth: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
	auth: state.auth,
});

export default connect(mapStateToProps, { createProfile, getCurrentUserProfile })(
	withRouter(EditProfile)
);