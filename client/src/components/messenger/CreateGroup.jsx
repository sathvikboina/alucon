import React, { useEffect, useState } from "react";
import axios from "axios";
import { useHistory } from "react-router-dom";
import { connect } from "react-redux";
import { setAlert } from "../../actions/alert";
import "./CreateGroup.css";
const AvatarOrInitial = ({ src, name, size = 36 }) => {
	const initial = name ? name.charAt(0).toUpperCase() : "?";
	const colors = ["#1a2a4a", "#2a4a8a", "#16a34a", "#7c3aed", "#b45309", "#0369a1"];
	const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;

	if (src) {
		return (
			<img
				src={src}
				alt="avatar"
				onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
				style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
			/>
		);
	}

	return (
		<div style={{
			width: size, height: size, borderRadius: "50%",
			background: colors[colorIndex],
			display: "flex", alignItems: "center", justifyContent: "center",
			color: "#fff", fontWeight: "700", fontSize: size * 0.4,
			flexShrink: 0,
		}}>
			{initial}
		</div>
	);
};

const CreateGroup = ({ auth: { authUser }, setAlert }) => {
	const [friends, setFriends] = useState([]);
	const [selectedFriends, setSelectedFriends] = useState([]);
	const [groupName, setGroupName] = useState("");

	const history = useHistory();

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

	const toggleFriendSelection = (friendId) => {
		setSelectedFriends((prevSelected) =>
			prevSelected.includes(friendId)
				? prevSelected.filter((id) => id !== friendId)
				: [...prevSelected, friendId]
		);
	};

	const onSubmit = async (e) => {
		e.preventDefault();
		if (!groupName.trim() || selectedFriends.length === 0) {
			setAlert("Please enter a group name and select friends", "danger");
			return;
		}

		try {
			const res = await axios.post(`/api/conversations/start`, {
				memberIds: selectedFriends,
				groupName: groupName,
			});

			setAlert("Group Created Successfully!", "success");
			history.push(`/messenger/group/${res.data._id}`); // 🚀 Redirect to new group chat
		} catch (err) {
			console.error(err.message);
			setAlert("Error creating group", "danger");
		}
	};

	return (
  <div className="create-group-wrapper">
    <div className="create-group-card">
      
      <h1 className="create-group-title">Start a New Group</h1>
      <p className="create-group-subtitle">
        Create a new conversation and invite people you follow.
      </p>

      <form onSubmit={onSubmit}>
        
        {/* Group Name */}
        <div className="form-group">
          <label className="form-label">
            Group Name <span className="required">*</span>
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. Project Alpha Team"
            required
            className="form-input"
          />
        </div>

        {/* Members */}
        <div className="form-group">
          <div className="form-header">
            <label className="form-label">
              Add Members <span className="required">*</span>
            </label>
            <span className="selected-count">
              {selectedFriends.length} selected
            </span>
          </div>

          <div className="members-list">
            {friends.length === 0 ? (
              <p className="empty-text">
                You are not following anyone yet, so there is no one to add.
              </p>
            ) : (
              friends.map((friend) => {
                const isSelected = selectedFriends.includes(friend._id);

                return (
                  <div
                    key={friend._id}
                    onClick={() => toggleFriendSelection(friend._id)}
                    className={`member-item ${isSelected ? "selected" : ""}`}
                  >
                    <div className="member-left">
                      <AvatarOrInitial src={friend.avatar} name={friend.name} size={36} />
                      <span className="member-name">
                        {friend.name}
                      </span>
                    </div>

                    <div className={`checkbox ${isSelected ? "checked" : ""}`}>
                      {isSelected && <i className="fas fa-check"></i>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Button */}
        <button
          type="submit"
          disabled={selectedFriends.length === 0 || !groupName.trim()}
          className={`create-btn ${
            selectedFriends.length === 0 || !groupName.trim()
              ? "disabled"
              : ""
          }`}
        >
          Create Group
        </button>
      </form>
    </div>
  </div>
);
};

const mapStateToProps = (state) => ({
	auth: state.auth,
});

export default connect(mapStateToProps, { setAlert })(CreateGroup);