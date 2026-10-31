import axios from "axios";
import { useEffect, useState } from "react";
import "./conversation.css";
import { getUserById } from "../../actions/users";
import {connect} from "react-redux";
import { closeSideNav } from "../../actions/alert";
import PropTypes from "prop-types";

const Conversation = ({ conversation, currentUser }) => {
	const [user, setUser] = useState(null);

	useEffect(() => {
		const friendId = conversation.members.find(
			(m) => m !== currentUser._id
		);

		const getUser = async () => {
			try {
				const res = await axios(`/api/users/${friendId}`);
				setUser(res.data);
			} catch (err) {
				console.log(err);
			}
		};
		getUser();
	}, [currentUser, conversation]);

	return (
		<div className="conversation">
			<img className="conversationImg" src={user && user.avatar} alt="" />
			<span className="conversationName">{user?.name}</span>
		</div>
	);
}

Conversation.propTypes = {
	closeSideNav: PropTypes.func.isRequired,
	getUserById: PropTypes.func.isRequired
};

export default connect(null, { closeSideNav, getUserById})(Conversation);
