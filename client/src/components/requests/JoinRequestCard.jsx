import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { rejectJoinRequest, approveJoinRequest } from "../../actions/request";
import "./JoinRequestCard.css";

const ROLE_FIELDS = {
  student: (r) => (
    <>
      <li><strong>Program:</strong> {r.program}</li>
      <li><strong>Starting Year:</strong> {r.starting_year}</li>
      <li><strong>Passing Year:</strong> {r.passing_year}</li>
    </>
  ),
  alumni: (r) => (
    <>
      <li><strong>Program:</strong> {r.program}</li>
      <li><strong>Starting Year:</strong> {r.starting_year}</li>
      <li><strong>Passing Year:</strong> {r.passing_year}</li>
      <li><strong>Working Area:</strong> {r.working_area}</li>
      <li><strong>Organisation:</strong> {r.organisation}</li>
      <li><strong>Designation:</strong> {r.designation}</li>
      <li><strong>Location:</strong> {r.location}</li>
    </>
  ),
  professor: (r) => (
    <>
      <li><strong>Designation:</strong> {r.designation}</li>
      <li><strong>Department:</strong> {r.department}</li>
    </>
  ),
};

const JoinRequestCard = ({ request, rejectJoinRequest, approveJoinRequest }) => {
  
 const handleReject = (id) => {
    const confirm = window.confirm("Do you want to decline this request?");
    if (!confirm) return;

    rejectJoinRequest(id);
  };

  const roleFields = ROLE_FIELDS[request.role?.toLowerCase()];


  return (
    <div className="join-request-card">
      <ul className="join-request-card-info">
        <li><strong>Name:</strong> {request.name}</li>
        <li>
          <strong>Role:</strong>
          <span className="role-badge">{request.role}</span>
        </li>
        <li><strong>Email:</strong> <span className="value">{request.email}</span></li>
        {roleFields && roleFields(request)}
      </ul>

      <div className="action-buttons-request-card">
        <button
          className="action-button-request-card approve-button"
          onClick={() => approveJoinRequest(request._id)}
        >
          <i className="fa fa-check" /> Approve
        </button>
        <button
          className="action-button-request-card reject-button"
         onClick={() => handleReject(request._id)}   // ✅ changed
        >
          <i className="fa fa-times" /> Decline
        </button>
      </div>
    </div>
  );
};

JoinRequestCard.propTypes = {
  request: PropTypes.object.isRequired,
  approveJoinRequest: PropTypes.func.isRequired,
  rejectJoinRequest: PropTypes.func.isRequired,
};

export default connect(null, { approveJoinRequest, rejectJoinRequest })(JoinRequestCard);