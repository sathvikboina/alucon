import axios from "axios";
import { useEffect, useState } from "react";
import "./chatOnline.css";

export default function ChatOnline({
	onlineUsers,
	currentId,
	setCurrentChat,
	getConversations,
}) {
	const [friends, setFriends] = useState([]);
	const [onlineFriends, setOnlineFriends] = useState([]);

	useEffect(() => {
		const getFriends = async () => {
			const res = await axios.get(`/api/users/friends/` + currentId);
			setFriends(res.data);
		};

		getFriends();
	}, [currentId]);

	useEffect(() => {
		if (onlineUsers.length) {
			setOnlineFriends(
				friends.filter((f) => onlineUsers.includes(f._id))
			);
		}
	}, [friends, onlineUsers]);

	const handleClick = async (user) => {
		try {
			const res = await axios.get(
				`/api/conversations/find/${currentId}/${user._id}`
			);
			getConversations({ _id: currentId });
			setCurrentChat(res.data);
		} catch (err) {
			console.log(err);
		}
	};

	return (
		<div className="chatOnline">
			{onlineFriends.map((o) => (
				<div
					className="chatOnlineFriend"
					onClick={() => handleClick(o)}
					key={o._id}
				>
					<div className="chatOnlineImgContainer">
						<img
							className="chatOnlineImg"
							src={o && o.avatar}
							alt=""
						/>
						<div className="chatOnlineBadge"></div>
					</div>
					<span className="chatOnlineName">{o.name}</span>
				</div>
			))}
		</div>
	);
}
