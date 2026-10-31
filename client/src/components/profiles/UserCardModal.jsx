import React from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import "./UserCardModal.css";

const UserCardModal = ({ profile }) => {
  return (
    <div className="user-modal-card">

      {/* LEFT IMAGE */}
      <div className="user-modal-left">
        <img src={profile.avatar} alt="avatar" />
      </div>

      {/* CONTENT */}
      <div className="user-modal-content">
        <h3>
          <Link to={`/profile/${profile._id}`}>
            {profile.name}
          </Link>
        </h3>

        <p className="user-modal-symbol">@</p>

        {/* Alumni */}
        {profile.role === "alumni" && (
          <p className="user-modal-text">
            Alumni @ IIITA ({profile.passing_year} Passout)
          </p>
        )}

        {/* Student */}
        {profile.role === "student" && (
          <p className="user-modal-text">
            Student @ IIITA ({profile.starting_year} - {profile.passing_year})
          </p>
        )}

        {/* Faculty */}
        {profile.role === "faculty" && (
          <p className="user-modal-text">
            {profile.designation} - {profile.department}
          </p>
        )}
      </div>

    </div>
  );
};

UserCardModal.propTypes = {
  profile: PropTypes.object.isRequired,
};

export default UserCardModal;