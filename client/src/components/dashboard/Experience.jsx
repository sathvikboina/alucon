import React from "react";
import { connect } from "react-redux";
import Moment from "react-moment";
import PropTypes from "prop-types";
import { deleteExperience } from "../../actions/users";

const Experience = ({ experience, deleteExperience }) => {
  const cardStyle = {
    border: "1px solid #d0e4f7",
    borderRadius: "8px",
    padding: "1rem 1.25rem",
    marginBottom: "12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "#fff",
  };

  const labelStyle = { color: "#555", fontSize: "0.9rem", margin: "3px 0" };
  const strongStyle = { color: "#1a5fa8" };

  const experiences = experience.map((exp) => (
    <div style={cardStyle} key={exp._id}>
      <div>
        <h4 style={{ margin: "0 0 4px", color: "#0d2e5c", fontSize: "1rem" }}>{exp.company}</h4>
        <p style={labelStyle}>
          <Moment format="DD/MM/YYYY">{exp.from}</Moment>
          {" — "}
          {exp.current ? "Present" : <Moment format="DD/MM/YYYY">{exp.to}</Moment>}
        </p>
        <p style={labelStyle}><span style={strongStyle}>Position:</span> {exp.title}</p>
        {exp.location && <p style={labelStyle}><span style={strongStyle}>Location:</span> {exp.location}</p>}
        {exp.description && <p style={labelStyle}><span style={strongStyle}>Description:</span> {exp.description}</p>}
      </div>
      <button
        onClick={() => deleteExperience(exp._id)}
        style={{ background: "none", border: "1px solid #e57373", color: "#c62828", borderRadius: "5px", padding: "5px 12px", cursor: "pointer", fontSize: "0.85rem", whiteSpace: "nowrap" }}
      >
        Remove
      </button>
    </div>
  ));

  return (
    <React.Fragment>
      <h3 style={{ margin: "0 0 12px", color: "#0d2e5c", fontSize: "1.1rem" }}>Experience</h3>
      {experience.length > 0 ? experiences : (
        <p style={{ color: "#aaa", fontSize: "0.9rem", textAlign: "center", padding: "1rem 0" }}>
          No experience added yet.
        </p>
      )}
    </React.Fragment>
  );
};

Experience.propTypes = {
  experience: PropTypes.array.isRequired,
  deleteExperience: PropTypes.func.isRequired,
};

export default connect(null, { deleteExperience })(Experience);