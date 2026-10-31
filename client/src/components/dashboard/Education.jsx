import React from "react";
import { connect } from "react-redux";
import Moment from "react-moment";
import PropTypes from "prop-types";
import { deleteEducation } from "../../actions/users";

const Education = ({ education, deleteEducation }) => {
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

  const educations = education.map((edu) => (
    <div style={cardStyle} key={edu._id}>
      <div>
        <h4 style={{ margin: "0 0 4px", color: "#0d2e5c", fontSize: "1rem" }}>{edu.school}</h4>
        <p style={labelStyle}>
          <Moment format="DD/MM/YYYY">{edu.from}</Moment>
          {" — "}
          {edu.current ? "Present" : <Moment format="DD/MM/YYYY">{edu.to}</Moment>}
        </p>
        <p style={labelStyle}>
          <span style={strongStyle}>Degree<span style={{ color: "red" }}>*</span>:</span> {edu.degree}
        </p>
        <p style={labelStyle}>
          <span style={strongStyle}>Field of Study<span style={{ color: "red" }}>*</span>:</span> {edu.fieldofstudy}
        </p>
        {edu.description && (
          <p style={labelStyle}><span style={strongStyle}>Description:</span> {edu.description}</p>
        )}
      </div>
      <button
        onClick={() => deleteEducation(edu._id)}
        style={{ background: "none", border: "1px solid #e57373", color: "#c62828", borderRadius: "5px", padding: "5px 12px", cursor: "pointer", fontSize: "0.85rem", whiteSpace: "nowrap" }}
      >
        Remove
      </button>
    </div>
  ));

  return (
    <React.Fragment>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <h3 style={{ margin: 0, color: "#0d2e5c", fontSize: "1.1rem" }}>Education</h3>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "#888" }}>
          <span style={{ color: "red" }}>*</span> Required field
        </p>
      </div>
      {education.length > 0 ? educations : (
        <p style={{ color: "#aaa", fontSize: "0.9rem", textAlign: "center", padding: "1rem 0" }}>
          No education added yet.
        </p>
      )}
    </React.Fragment>
  );
};

Education.propTypes = {
  education: PropTypes.array.isRequired,
  deleteEducation: PropTypes.func.isRequired,
};

export default connect(null, { deleteEducation })(Education);