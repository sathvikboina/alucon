import React, { useState } from "react";
import { connect } from "react-redux";
import { addStory } from "../../actions/story";
import { useHistory } from "react-router-dom";
import { setAlert } from "../../actions/alert";
import PropTypes from "prop-types";
import uploadImage from "../../utils/uploadImage";

const S = {
  hero: {
    background: "linear-gradient(135deg, #0b1e3b 0%, #16325c 55%, #1d437e 100%)",
    padding: "24px 30px",
    maxWidth: 1100,
    margin: "20px auto 24px",
    borderRadius: 14,
    boxShadow: "0 4px 20px rgba(11, 30, 59, 0.14)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    boxSizing: "border-box",
  },
  heroInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  heroKicker: {
    fontSize: "0.68rem",
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#93c5fd",
    marginBottom: 4,
    display: "block",
  },
  heroTitle: {
    fontSize: "1.65rem",
    fontWeight: 700,
    color: "#ffffff",
    margin: 0,
    lineHeight: 1.2,
    letterSpacing: "-0.01em",
  },
  heroSubtitle: {
    fontSize: "0.85rem",
    color: "rgba(255, 255, 255, 0.68)",
    margin: "4px 0 0",
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
						<span style={S.heroKicker}>Voices &amp; Perspectives</span>
						<h1 style={S.heroTitle}>Share Your Story</h1>
						<p style={S.heroSubtitle}>Contribute your journey, milestones, and lessons to the alumni network</p>
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