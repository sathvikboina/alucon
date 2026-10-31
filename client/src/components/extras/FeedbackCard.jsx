import React from "react";
import PropTypes from "prop-types";
import { deleteFeedback } from "../../actions/extras";
import { connect } from "react-redux";
import "./FeedBackCard.css"
const FeedbackCard = ({ data, deleteFeedback }) => {

  // ✅ Format backend date
  const formattedDate = data.date
    ? new Date(data.date).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "N/A";

  return (
    <div className="feedback-card">

      {/* Content */}
      <div className="feedback-content">

        <div className="feedback-row">
          <span className="label">Name:</span>
          <span>{data.name}</span>
        </div>

        <div className="feedback-row">
          <span className="label">Email:</span>
          <span>{data.email}</span>
        </div>

        <div className="feedback-row">
          <span className="label">Role:</span>
          <span className="capitalize">{data.role}</span>
        </div>

        {/* ✅ Date from backend */}
        <div className="feedback-row">
          <span className="label">Submitted:</span>
          <span>{formattedDate}</span>
        </div>

        {/* Feedback */}
        <div className="feedback-message">
          <span className="label">Feedback:</span>
          <p>{data.feedback}</p>
        </div>

      </div>

      {/* Action */}
      <div className="feedback-actions">
        <button
          className="delete-btn"
          onClick={() => deleteFeedback(data._id)}
        >
          ✖ Delete
        </button>
      </div>

    </div>
  );
};

FeedbackCard.propTypes = {
  data: PropTypes.object.isRequired,
  deleteFeedback: PropTypes.func.isRequired,
};

export default connect(null, { deleteFeedback })(FeedbackCard);