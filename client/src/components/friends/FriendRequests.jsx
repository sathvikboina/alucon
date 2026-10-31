import React, { useEffect, useState } from "react";
import axios from "axios";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { setAlert } from "../../actions/alert";
import { notificationStore } from "../../socket";

const FriendRequests = ({ auth: { authUser }, setAlert }) => {
	const [requests, setRequests] = useState([]);

	useEffect(() => {
		// Clear notification dot when viewing the requests page
		notificationStore.clearAllRequests();

		const fetchRequests = async () => {
			try {
				const res = await axios.get(`/api/friends/requests`);
				setRequests(res.data);
			} catch (err) {
				console.error(err.message);
			}
		};
		fetchRequests();
	}, []);

	const acceptRequest = async (requestId) => {
		try {
			await axios.post(`/api/friends/accept`, { requestId });
			setAlert("Friend request accepted!", "success");
			setRequests(requests.filter((r) => r._id !== requestId));
		} catch (err) {
			console.error(err.message);
			setAlert("Error accepting request", "danger");
		}
	};

	const declineRequest = async (requestId) => {
		try {
			await axios.post(`/api/friends/decline`, { requestId });
			setAlert("Friend request declined!", "info");
			setRequests(requests.filter((r) => r._id !== requestId));
		} catch (err) {
			console.error(err.message);
			setAlert("Error declining request", "danger");
		}
	};

	return (
		<div className="container" style={{ padding: "2rem" }}>
			<div style={{ maxWidth: "800px", margin: "0 auto", paddingBottom: "1.5rem", marginBottom: "2rem", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
				<h1 style={{ margin: 0, fontSize: "1.8rem", color: "#0f172a", fontWeight: "700" }}>
					Pending Requests
				</h1>
				<p style={{ margin: "0.5rem 0 0 0", color: "#64748b", fontSize: "0.95rem" }}>
					Review and manage your incoming connection requests.
				</p>
			</div>

			{requests.length === 0 ? (
				<h3 style={{ textAlign: "center", color: "gray" }}>
					No Pending Requests
				</h3>
			) : (
				<div className="requests-list" style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "800px", margin: "0 auto" }}>
					{requests.map((req) => (
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
								border: "1px solid #f1f5f9"
							}}
							onMouseOver={(e) => { e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.1)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
							onMouseOut={(e) => { e.currentTarget.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.05)"; e.currentTarget.style.transform = "translateY(0)"; }}
						>
							{/* User Info Section */}
							<div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
								<img
									src={req.sender.avatar || "/default-avatar.png"}
									alt="avatar"
									style={{
										width: "60px",
										height: "60px",
										borderRadius: "50%",
										objectFit: "cover",
										border: "2px solid #e2e8f0",
									}}
								/>
								<div style={{ textAlign: "left" }}>
									<h4 style={{ margin: "0 0 0.2rem 0", fontSize: "1.1rem", color: "#1e293b", fontWeight: "600" }}>{req.sender.name}</h4>
									<div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
										{req.sender.role && (
											<span style={{ fontSize: "0.85rem", color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: "12px" }}>
												{req.sender.role.charAt(0).toUpperCase() + req.sender.role.slice(1)}
											</span>
										)}
										{req.sender.location && (
											<span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
												📍 {req.sender.location}
											</span>
										)}
									</div>
								</div>
							</div>

							{/* Action Buttons */}
							<div style={{ display: "flex", gap: "0.8rem" }}>
								<button
									className="btn"
									style={{
										background: "#3b82f6",
										color: "white",
										border: "none",
										padding: "0.5rem 1.2rem",
										borderRadius: "6px",
										fontWeight: "500",
										cursor: "pointer",
										boxShadow: "0 2px 4px rgba(59, 130, 246, 0.3)"
									}}
									onClick={() => acceptRequest(req._id)}
								>
									Accept
								</button>
								<button
									className="btn"
									style={{
										background: "#f1f5f9",
										color: "#475569",
										border: "1px solid #cbd5e1",
										padding: "0.5rem 1.2rem",
										borderRadius: "6px",
										fontWeight: "500",
										cursor: "pointer"
									}}
									onClick={() => declineRequest(req._id)}
								>
									Decline
								</button>
							</div>
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

export default connect(mapStateToProps, { setAlert })(FriendRequests);