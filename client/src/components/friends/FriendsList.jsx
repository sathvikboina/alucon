import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const AvatarOrInitial = ({ src, name, size = 40 }) => {
	const initial = name ? name.charAt(0).toUpperCase() : "?";
	const colors = ["#1a2a4a", "#2a4a8a", "#16a34a", "#7c3aed", "#b45309", "#0369a1"];
	const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;

	if (src) {
		return (
			<img
				src={src}
				alt="avatar"
				onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
				style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", marginRight: "1em", flexShrink: 0 }}
			/>
		);
	}

	return (
		<div style={{
			width: size, height: size, borderRadius: "50%",
			background: colors[colorIndex],
			display: "flex", alignItems: "center", justifyContent: "center",
			color: "#fff", fontWeight: "700", fontSize: size * 0.4,
			marginRight: "1em", flexShrink: 0,
		}}>
			{initial}
		</div>
	);
};

const FriendsList = () => {
	const [friends, setFriends] = useState([]);
	const [searchText, setSearchText] = useState("");

	useEffect(() => {
		const fetchFriends = async () => {
			try {
				const res = await axios.get(`/api/users/following`);
				setFriends(res.data);
			} catch (err) {
				console.error(err.message);
			}
		};
		fetchFriends();
	}, []);

	const filteredFriends = friends.filter(friend =>
		friend.name.toLowerCase().includes(searchText.toLowerCase())
	);

	return (
		<div className="container">
			{/* <h1 className="large text-primary" style={{ color: "#1a2a4a" }}>
  Your Friends
</h1> */}

			{/* Search Input */}
			<div className="form-group" style={{ marginBottom: "1em" }}>
				<input
					type="text"
					className="form-control"
					placeholder="Search people you follow..."
					value={searchText}
					onChange={(e) => setSearchText(e.target.value)}
				/>
			</div>

			{filteredFriends.length === 0 ? (
				<h3>You are not following anyone yet</h3>
			) : (
				<div className="friends-list">
					{filteredFriends.map((friend) => (
						<Link
							to={`/messenger/chat/${friend._id}`}
							key={friend._id}
							className="card p-3 mb-3"
							style={{ textDecoration: "none", color: "black" }}
						>
							<div style={{ display: "flex", alignItems: "center" }}>
								<AvatarOrInitial src={friend.avatar} name={friend.name} size={40} />
								<strong>{friend.name}</strong>
							</div>
						</Link>
					))}
				</div>
			)}
		</div>
	);
};

export default FriendsList;