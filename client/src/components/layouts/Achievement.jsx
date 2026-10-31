import React, { useState } from "react";
import PropTypes from "prop-types";
import { submitAchievement } from "../../actions/extras";
import { connect } from "react-redux";
import { useHistory } from "react-router-dom";
import { setAlert } from "../../actions/alert";
import axios from "axios";
import { Alert, Snackbar } from "@mui/material";

const Achievement = ({ setAlert, submitAchievement }) => {
	const [formInput, setFormInput] = useState({
		name: "",
		enrollment_number: "",
		program: "btech-it",
		passing_year: "",
		award_date: "",
	});

	const [reward, setReward] = useState({
		title: "",
		type: "",
		organization: "",
		receivedBy: "",
		cashPrize: "",
	});

	const [image, setImage] = useState("");
	const [proof, setProof] = useState("");
	const [loading, setLoading] = useState(false);
	const [successOpen, setSuccessOpen] = useState(false);
	const [errorOpen, setErrorOpen] = useState(false);

	const history = useHistory();

	const onChange = (e) =>
		setFormInput({ ...formInput, [e.target.name]: e.target.value });

	const onSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);

		try {
			const config = { headers: { "Content-Type": "multipart/form-data" } };

			const formData1 = new FormData();
			formData1.append("file", image);
			const res1 = await axios.post(
				`/upload-image`,
				formData1,
				config
			);

			const formData2 = new FormData();
			formData2.append("file", proof);
			const res2 = await axios.post(
				`/upload-image`,
				formData2,
				config
			);

			const success = await submitAchievement(
				{ ...formInput, reward },
				`/awards/${res1.data}`,
				`/awards/${res2.data}`
			);

			setLoading(false);

			if (success) {
				setSuccessOpen(true);
				setTimeout(() => history.push("/"), 3000);
			} else {
				setErrorOpen(true);
			}
		} catch (error) {
			setLoading(false);
			setErrorOpen(true);
		}
	};

	return (
		<>
			<div className="form-container">
				<form className="form" onSubmit={onSubmit}>
					<p style={{ color: "red", marginBottom: "1em" }}>
						<span>*</span> Indicates required field
					</p>

					<div className="form-group">
						<label>Name *</label>
						<input
							type="text"
							name="name"
							value={formInput.name}
							required
							onChange={onChange}
						/>
					</div>

					<div className="form-group">
						<label>Enrollment Number *</label>
						<input
							type="text"
							name="enrollment_number"
							value={formInput.enrollment_number}
							required
							onChange={onChange}
						/>
					</div>

					<div className="form-group">
						<label>Program *</label>
						<select
							name="program"
							value={formInput.program}
							required
							onChange={onChange}
						>
							<option value="btech-it">B.Tech IT</option>
							<option value="btech-ece">B.Tech ECE</option>
							<option value="mtech">M.Tech</option>
							<option value="mba">MBA</option>
							<option value="ms">MS</option>
							<option value="dual-degree">Dual-Degree</option>
							<option value="phd">PhD</option>
						</select>
					</div>

					<div className="form-group">
						<label>Passout Year *</label>
						<input
							type="number"
							name="passing_year"
							value={formInput.passing_year}
							required
							min="1995"
							onChange={onChange}
						/>
					</div>

					<div className="form-group">
						<label>Date of Award *</label>
						<input
							type="date"
							name="award_date"
							value={formInput.award_date}
							required
							onChange={onChange}
						/>
					</div>

					<h4>Reward Details</h4>
					<div className="form-group">
						<label>Title of Award *</label>
						<input
							type="text"
							value={reward.title}
							required
							onChange={(e) =>
								setReward({ ...reward, title: e.target.value })
							}
						/>
					</div>
					<div className="form-group">
						<label>Type of Award *</label>
						<input
							type="text"
							value={reward.type}
							required
							onChange={(e) =>
								setReward({ ...reward, type: e.target.value })
							}
						/>
					</div>
					<div className="form-group">
						<label>Name of Awarding Organisation *</label>
						<input
							type="text"
							value={reward.organization}
							required
							onChange={(e) =>
								setReward({ ...reward, organization: e.target.value })
							}
						/>
					</div>
					<div className="form-group">
						<label>Received Jointly / Solo *</label>
						<input
							type="text"
							value={reward.receivedBy}
							required
							onChange={(e) =>
								setReward({ ...reward, receivedBy: e.target.value })
							}
						/>
					</div>
					<div className="form-group">
						<label>Cash Prize Received *</label>
						<input
							type="text"
							value={reward.cashPrize}
							required
							onChange={(e) =>
								setReward({ ...reward, cashPrize: e.target.value })
							}
						/>
					</div>

					<div className="form-group">
						<label>Photo (jpg/png/jpeg)</label>
						<input
							type="file"
							accept="image/*"
							onChange={(e) => setImage(e.target.files[0])}
						/>
					</div>

					<div className="form-group">
						<label>Proof (pdf/image)</label>
						<input
							type="file"
							accept="application/pdf,image/*"
							onChange={(e) => setProof(e.target.files[0])}
						/>
					</div>

					<input
						type="submit"
						value={loading ? "Submitting..." : "Submit"}
						className="btn btn-primary"
						disabled={loading}
					/>

					{loading && (
						<div style={{ marginTop: "1em", color: "blue" }}>
							<i className="fa fa-spinner fa-spin" style={{ marginRight: "8px" }}></i>
							Submitting your achievement...
						</div>
					)}
				</form>
			</div>

			<Snackbar open={successOpen} autoHideDuration={6000} onClose={() => setSuccessOpen(false)}>
				<Alert onClose={() => setSuccessOpen(false)} severity="success" variant="filled">
					Achievement submitted successfully!
				</Alert>
			</Snackbar>

			<Snackbar open={errorOpen} autoHideDuration={6000} onClose={() => setErrorOpen(false)}>
				<Alert onClose={() => setErrorOpen(false)} severity="error" variant="filled">
					Submission failed. Please try again.
				</Alert>
			</Snackbar>
		</>
	);
};

Achievement.propTypes = {
	submitAchievement: PropTypes.func.isRequired,
	setAlert: PropTypes.func.isRequired,
};

export default connect(null, { setAlert, submitAchievement })(Achievement);
