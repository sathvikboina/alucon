import React, { useEffect, useState } from "react";
import axios from "axios";
import { connect } from "react-redux";
import { setAlert } from "../../actions/alert";

const AvatarOrInitial = ({ src, name, size = 60 }) => {
	const initial = name ? name.charAt(0).toUpperCase() : "?";
	const colors = ["#1a2a4a", "#2a4a8a", "#16a34a", "#7c3aed", "#b45309", "#0369a1"];
	const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;

	if (src) {
		return (
			<img
				src={src}
				alt="avatar"
				onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
				style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0", flexShrink: 0 }}
			/>
		);
	}

	return (
		<div style={{
			width: size, height: size, borderRadius: "50%",
			background: colors[colorIndex],
			display: "flex", alignItems: "center", justifyContent: "center",
			color: "#fff", fontWeight: "700", fontSize: size * 0.4,
			border: "2px solid #e2e8f0", flexShrink: 0,
		}}>
			{initial}
		</div>
	);
};

const SentRequests = ({ auth: { authUser }, setAlert }) => {
	const [sentRequests, setSentRequests] = useState([]);

	useEffect(() => {
		const fetchSentRequests = async () => {
			try {
				const res = await axios.get(`/api/friends/requests/sent`);
				setSentRequests(res.data);
			} catch (err) {
				console.error(err.message);
			}
		};
		fetchSentRequests();
	}, []);

	const cancelRequest = async (requestId) => {
		try {
			await axios.post(`/api/friends/cancel`, { requestId });
			setAlert("Friend request canceled!", "info");
			setSentRequests(sentRequests.filter((r) => r._id !== requestId));
		} catch (err) {
			console.error(err.message);
			setAlert("Error canceling request", "danger");
		}
	};

	return (
		<div className="container" style={{ padding: "2rem" }}>
			{/* Header — matches FriendRequests */}
			<div style={{ maxWidth: "800px", margin: "0 auto", paddingBottom: "1.5rem", marginBottom: "2rem", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
				<h1 style={{ margin: 0, fontSize: "1.8rem", color: "#0f172a", fontWeight: "700" }}>
					Sent Requests
				</h1>
				<p style={{ margin: "0.5rem 0 0 0", color: "#64748b", fontSize: "0.95rem" }}>
					Manage the connection requests you've sent out.
				</p>
			</div>

			{sentRequests.length === 0 ? (
				<h3 style={{ textAlign: "center", color: "gray" }}>
					No Sent Requests Yet
				</h3>
			) : (
				<div
					className="sent-requests-list"
					style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "800px", margin: "0 auto" }}
				>
					{sentRequests.filter((req) => req.receiver != null).map((req) => (
						<div
							key={req._id}
							className="request-item"
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								padding: "1rem 1.5rem",
								borderRadius: "12px",
								boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
								background: "#fff",
								transition: "all 0.2s ease",
								border: "1px solid #f1f5f9",
							}}
							onMouseOver={(e) => {
								e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.1)";
								e.currentTarget.style.transform = "translateY(-2px)";
							}}
							onMouseOut={(e) => {
								e.currentTarget.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.05)";
								e.currentTarget.style.transform = "translateY(0)";
							}}
						>
							{/* User Info */}
							<div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
								<AvatarOrInitial src={req.receiver.avatar} name={req.receiver.name} size={60} />
								<div style={{ textAlign: "left" }}>
									<h4 style={{ margin: "0 0 0.2rem 0", fontSize: "1.1rem", color: "#1e293b", fontWeight: "600" }}>
										{req.receiver.name}
									</h4>
									<div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
										{req.receiver.role && (
											<span style={{ fontSize: "0.85rem", color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: "12px" }}>
												{req.receiver.role.charAt(0).toUpperCase() + req.receiver.role.slice(1)}
											</span>
										)}
										{req.receiver.location && (
											<span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
												📍 {req.receiver.location}
											</span>
										)}
									</div>
								</div>
							</div>

							{/* Cancel Button */}
							<button
								className="btn"
								style={{
									background: "#f1f5f9",
									color: "#475569",
									border: "1px solid #cbd5e1",
									padding: "0.5rem 1.2rem",
									borderRadius: "6px",
									fontWeight: "500",
									cursor: "pointer",
								}}
								onMouseOver={(e) => {
									e.currentTarget.style.background = "#fee2e2";
									e.currentTarget.style.color = "#dc2626";
									e.currentTarget.style.borderColor = "#fca5a5";
								}}
								onMouseOut={(e) => {
									e.currentTarget.style.background = "#f1f5f9";
									e.currentTarget.style.color = "#475569";
									e.currentTarget.style.borderColor = "#cbd5e1";
								}}
								onClick={() => cancelRequest(req._id)}
							>
								Cancel Request
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

const mapStateToProps = (state) => ({
	auth: state.auth,
});

export default connect(mapStateToProps, { setAlert })(SentRequests);