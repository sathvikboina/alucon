import React, { useEffect, useState } from "react";
import axios from "axios";
import { connect } from "react-redux";
import { setAlert } from "../../actions/alert";

const BlockList = ({ auth: { authUser }, setAlert }) => {
	const [blockedUsers, setBlockedUsers] = useState([]);
	const [friends, setFriends] = useState([]);

	useEffect(() => {
		const fetchBlocked = async () => {
			try {
				const res = await axios.get(`/api/block/blocked`);
				setBlockedUsers(res.data);
			} catch (err) {
				console.error(err.message);
			}
		};

		const fetchFriends = async () => {
			try {
				const res = await axios.get(`/api/users/following`);
				setFriends(res.data);
			} catch (err) {
				console.error(err.message);
			}
		};

		fetchBlocked();
		fetchFriends();
	}, []);

	const blockUser = async (userId) => {
		try {
			await axios.post(`/api/block/block`, { userIdToBlock: userId });
			setAlert("User blocked", "success");
			setBlockedUsers((prev) => [...prev, friends.find(f => f._id === userId)]);
		} catch (err) {
			console.error(err.message);
			setAlert("Error blocking user", "danger");
		}
	};

	const unblockUser = async (userId) => {
		try {
			await axios.post(`/api/block/unblock`, { userIdToUnblock: userId });
			setAlert("User unblocked", "success");
			setBlockedUsers(blockedUsers.filter((u) => u._id !== userId));
		} catch (err) {
			console.error(err.message);
			setAlert("Error unblocking user", "danger");
		}
	};

	return (
		<div className="container">
			<h1 className="large text-primary">Blocked Users</h1>

			{blockedUsers.length === 0 ? (
				<h3>No Blocked Users</h3>
			) : (
				<div className="blocked-users-list">
					{blockedUsers.map((user) => (
						<div key={user._id} className="card p-3 mb-3" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
							<div>
								<img
									src={user.avatar || "/default-avatar.png"}
									alt="avatar"
									style={{ width: "40px", height: "40px", borderRadius: "50%", marginRight: "1em" }}
								/>
								<strong>{user.name}</strong>
							</div>
							<div>
								<button
									className="btn btn-danger"
									onClick={() => unblockUser(user._id)}
								>
									Unblock
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			<hr />

			<h2 className="text-primary">Block someone you follow</h2>
			<div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid lightgray", padding: "1em" }}>
				{friends.map((friend) => (
					!blockedUsers.some(b => b._id === friend._id) && (
						<div key={friend._id} style={{ marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
							<div>
								{friend.name}
							</div>
							<button
								className="btn btn-warning"
								onClick={() => blockUser(friend._id)}
							>
								Block
							</button>
						</div>
					)
				))}
			</div>
		</div>
	);
};

const mapStateToProps = (state) => ({
	auth: state.auth,
});

export default connect(mapStateToProps, { setAlert })(BlockList);
