import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Link, withRouter } from "react-router-dom";
import PropTypes from "prop-types";
import {
	createPost,
	createPostRequest,
	getRequirePostApproval,
} from "../../actions/post";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import parse from "html-react-parser";
import sanitizeHtml from "../../utils/sanitizeHtml";
import { setAlert } from "../../actions/alert";
import { getAllChannels } from "../../actions/channel";
import axios from "axios";
import { Snackbar, Alert } from "@mui/material";
import CreatableSelect from "react-select/creatable";
import "./PostForm.css";

const PostForm = ({
	createPost,
	createPostRequest,
	setAlert,
	getAllChannels,
	getRequirePostApproval,
	history,
	post: {
		settings: { requireApproval },
	},
	extras: { channels },
}) => {
	const [text, setText] = useState("");
	const [heading, setHeading] = useState("");
	const [channel, setChannel] = useState("");
	const [visibleStudent, setVisibleStudent] = useState(false);
	const [visibleFaculty, setVisibleFaculty] = useState(false);
	const [visibleAlumni, setVisibleAlumni] = useState(false);
	const [successOpen, setSuccessOpen] = useState(false);
	const [errorOpen, setErrorOpen] = useState(false);
	const [image, setImage] = useState("");

	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		(async function () {
			await getRequirePostApproval();
			await getAllChannels();
		})();
	}, []);

	const onSubmit = async (e) => {
		e.preventDefault();

		if (isSubmitting) return;

		if (!heading.trim()) {
			setAlert("Heading is required", "danger");
			return;
		}
		if (!text || text.trim() === "" || text === "<p></p>") {
			setAlert("Post content is required", "danger");
			return;
		}
		if (!visibleStudent && !visibleFaculty && !visibleAlumni) {
			setAlert("Please check at least one visibility checkbox", "danger");
			return;
		}
		if (!channel || channel.trim() === "") {
			setAlert("Channel is required", "danger");
			return;
		}

		setIsSubmitting(true);

		try {
			let success = 0;
			const config = {
				headers: { "Content-Type": "multipart/form-data" },
			};

			const images = [];

			// Upload image if selected
			// REPLACE only the image upload block inside onSubmit:
			if (image !== "") {
				const formData1 = new FormData();
				formData1.append("file", image);
				try {
					const res1 = await axios.post("/api/upload", formData1, config);
					images.push(res1.data.url);  // ← was res1.data
				} catch (err) {
					setAlert("Image upload failed", "danger");
					setIsSubmitting(false);
					return;
				}
			}

			const payload = {
				heading: heading.trim(),
				text: text.trim(),
				visibleStudent,
				visibleFaculty,
				visibleAlumni,
				channel: channel.trim(), // ✅ Added .trim() for safety
				images,
			};

			success = requireApproval
				? await createPostRequest(payload)
				: await createPost(payload);

			if (success) {
				setSuccessOpen(true);
				// Reset form after successful post
				setHeading("");
				setText("");
				setChannel("");
				setVisibleStudent(false);
				setVisibleFaculty(false);
				setVisibleAlumni(false);
				setImage("");
			} else {
				setErrorOpen(true);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCloseSuccess = () => setSuccessOpen(false);
	const handleCloseError = () => setErrorOpen(false);

	return (
		<React.Fragment>
			<div className="container post-form-container">
				<div className="form-header">
					<h1 className="large text-primary">Write a post</h1>
					<small style={{ color: "red" }}>* = required field</small>
				</div>
				<form className="form" onSubmit={onSubmit}>
					{/* Heading */}
					<div className="form-group">
						<label>Topic/Heading <span style={{ color: "red" }}>*</span></label>
						<input
							type="text"
							placeholder="Topic/Heading"
							name="heading"
							value={heading}
							onChange={(e) => setHeading(e.target.value)}
							required
						/>
					</div>

					{/* Post Body */}
					<div className="form-group">
						<label>Post Body <span style={{ color: "red" }}>*</span></label>
						<CKEditor
							editor={ClassicEditor}
							data={text}
							onChange={(event, editor) => setText(editor.getData())}
							required
						/>
					</div>

					{/* Image Upload */}
					<div className="form-group">
						<label>Attach Images</label>
						<input
							type="file"
							accept="image/*"
							onChange={(e) => setImage(e.target.files[0])}
						/>
					</div>

					{/* Visibility */}
					<div className="form-group select-post-visibility">
						<p style={{ fontSize: "1.2rem" }} className="secondary-text">
							Who should see this post? <span style={{ color: "red" }}>*</span>
						</p>
						<div className="form-group checkbox-inline">
							<label>Students</label>
							<input
								type="checkbox"
								checked={visibleStudent}
								onChange={() => setVisibleStudent(!visibleStudent)}
							/>
						</div>
						<div className="form-group checkbox-inline">
							<label>Faculty</label>
							<input
								type="checkbox"
								checked={visibleFaculty}
								onChange={() => setVisibleFaculty(!visibleFaculty)}
							/>
						</div>
						<div className="form-group checkbox-inline">
							<label>Alumni</label>
							<input
								type="checkbox"
								checked={visibleAlumni}
								onChange={() => setVisibleAlumni(!visibleAlumni)}
							/>
						</div>
					</div>

					{/* Channel */}
					<div className="form-group">
						<label>Select Channel <span style={{ color: "red" }}>*</span></label>
						<CreatableSelect
							isClearable
							options={
								channels
									? channels.map((c) => ({ value: c.name, label: c.name }))
									: []
							}
							onChange={(selectedOption) => {
								if (selectedOption) setChannel(selectedOption.value);
								else setChannel("");
							}}
							value={channel ? { value: channel, label: channel } : null}
						/>
					</div>

					{/* Submit */}
					<div className="back-submit-buttons">
						<Link className="btn btn-light my-1" to="/feed/topic/Placements" style={{ width: "40%" }}>
							Go Back
						</Link>
						<input
							type="submit"
							value={isSubmitting ? "Posting..." : "Submit"}
							className="btn btn-primary my-1"
							style={{ width: "40%" }}
							disabled={isSubmitting}
						/>
					</div>
				</form>
			</div>

			{/* Preview */}
			{text && (
				<div className="container preview" style={{ marginBottom: "2em" }}>
					<p><strong>Preview:</strong></p>
					<div className="parsed-text">{parse(sanitizeHtml(text))}</div>
				</div>
			)}

			{/* Snackbar Messages */}
			<Snackbar open={successOpen} autoHideDuration={6000} onClose={handleCloseSuccess}>
				<Alert onClose={handleCloseSuccess} severity="success" variant="filled" sx={{ width: "100%" }}>
					{requireApproval ? "Post Request Sent Successfully" : "Post Created Successfully"}
				</Alert>
			</Snackbar>

			<Snackbar open={errorOpen} autoHideDuration={6000} onClose={handleCloseError}>
				<Alert onClose={handleCloseError} severity="error" variant="filled" sx={{ width: "100%" }}>
					{requireApproval ? "Post Request Failed" : "Post Creation Failed"}
				</Alert>
			</Snackbar>
		</React.Fragment>
	);
};

PostForm.propTypes = {
	createPost: PropTypes.func.isRequired,
	createPostRequest: PropTypes.func.isRequired,
	setAlert: PropTypes.func.isRequired,
	post: PropTypes.object.isRequired,
	extras: PropTypes.object.isRequired,
	getAllChannels: PropTypes.func.isRequired,
	getRequirePostApproval: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
	post: state.post,
	extras: state.extras,
});

export default connect(mapStateToProps, {
	createPost,
	createPostRequest,
	setAlert,
	getAllChannels,
	getRequirePostApproval,
})(withRouter(PostForm));