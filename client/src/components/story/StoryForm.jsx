import React, { useState } from "react";
import { connect } from "react-redux";
import { addStory } from "../../actions/story";
import { useHistory } from "react-router-dom";
import { setAlert } from "../../actions/alert";
import PropTypes from "prop-types";
import uploadImage from "../../utils/uploadImage";

const S = {
  hero: {
    background: "#1e3a5f",
    padding: "1.1rem 2rem",
    width: "100%",
  },
  heroInner: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "0.5rem",
    padding: "0 0.5rem",
  },
  heroTitle: {
    fontSize: "1.4rem",
    fontWeight: 700,
    color: "#ffffff",
    margin: 0,
    lineHeight: 1.2,
  },
  heroSubtitle: {
    fontSize: "0.8rem",
    color: "rgba(255,255,255,0.65)",
    margin: "0.2rem 0 0",
  },
};

const StoryForm = ({ addStory, setAlert, auth: { authUser } }) => {
	const history = useHistory();
	const [text, setText] = useState("");
	const [image, setImage] = useState(null);
	const [loading, setLoading] = useState(false);

	const onSubmit = async (e) => {
		e.preventDefault();

		if (!text.trim()) {
			setAlert("Story cannot be empty", "danger");
			return;
		}

		if (loading) return;
		setLoading(true);

		try {
			let imageUrl = null;

			// ✅ Upload image first (Cloudinary)
			if (image) {
				imageUrl = await uploadImage(image);
			}

			// ✅ Send only data (no file)
			const data = {
				text,
				image: imageUrl,
			};

			await addStory(data);

			history.push("/showcase?tab=stories");
		} catch (err) {
			console.error(err);
			setAlert("Failed to post story", "danger");
			setLoading(false);
		}
	};

	// 🚫 Only allow Alumni
	if (authUser && authUser.role !== "alumni") {
		return (
			<h2 style={{ textAlign: "center", marginTop: "2em" }}>
				Access Denied: Alumni Only
			</h2>
		);
	}

	return (
		<>
			{/* ── Navy Blue Hero Banner (matches Alumni Stories) ── */}
			<div style={S.hero}>
				<div style={S.heroInner}>
					<div>
						<h1 style={S.heroTitle}>Share Your Story</h1>
						<p style={S.heroSubtitle}>Add your journey to our community of graduates</p>
					</div>
				</div>
			</div>

			<div className="container">
				{/* ✅ removed encType */}
				<form className="form" onSubmit={onSubmit}>
					<div className="form-group">
						<textarea
							placeholder="Share your favorite memory, journey or experience..."
							name="text"
							value={text}
							onChange={(e) => setText(e.target.value)}
							rows="8"
							required
						/>
					</div>

					<div className="form-group">
						<label>Attach a Photo (optional)</label>
						<input
							type="file"
							accept="image/*"
							onChange={(e) => setImage(e.target.files[0])}
						/>
					</div>

					<input type="submit" className="btn btn-primary" value={loading ? "Posting..." : "Post Story"} disabled={loading} />
				</form>
			</div>
		</>
	);
};

StoryForm.propTypes = {
	addStory: PropTypes.func.isRequired,
	setAlert: PropTypes.func.isRequired,
	auth: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
	auth: state.auth,
});

export default connect(mapStateToProps, { addStory, setAlert })(StoryForm);