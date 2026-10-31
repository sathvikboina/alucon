import React, { useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { deleteAccount } from "../../actions/users";

const ActionButton = ({ icon, label, onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        width: "100%",
        padding: "11px 14px",
        marginBottom: "10px",
        border: `1px solid ${hovered ? "#1a5fa8" : "#d0e4f7"}`,
        borderRadius: "8px",
        backgroundColor: hovered ? "#1a5fa8" : "#fff",
        color: hovered ? "#fff" : "#1a5fa8",
        fontSize: "0.92rem",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
        transition: "all 0.18s ease",
        fontWeight: 500,
      }}
    >
      <i className={icon} style={{ width: "16px", textAlign: "center" }}></i>
      {label}
    </button>
  );
};

const DashboardActions = ({ deleteAccount, onEditProfile, onAddExperience, onAddEducation }) => {
  return (
    <div style={{ padding: "0.25rem" }}>
      <p style={{ fontSize: "0.72rem", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px", marginLeft: "2px" }}>
        Actions
      </p>
      <ActionButton icon="fas fa-user-circle" label="Edit Profile" onClick={onEditProfile} />
      <ActionButton icon="fab fa-black-tie" label="Add Experience" onClick={onAddExperience} />
      <ActionButton icon="fas fa-graduation-cap" label="Add Education" onClick={onAddEducation} />
    </div>
  );
};

DashboardActions.propTypes = {
  deleteAccount: PropTypes.func.isRequired,
  onEditProfile: PropTypes.func,
  onAddExperience: PropTypes.func,
  onAddEducation: PropTypes.func,
};

export default connect(null, { deleteAccount })(DashboardActions);