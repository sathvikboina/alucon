import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import Moment from "react-moment";
import { Link } from "react-router-dom";
import { rejectPostRequest, approvePostRequest } from "../../actions/request";
import parse from "html-react-parser";
import sanitizeHtml from "../../utils/sanitizeHtml";
import "./PostRequestCard.css";

const PostRequestCard = ({ request, rejectPostRequest, approvePostRequest }) => {
  const { heading, text, avatar, user, date, name, visibility, images, channel } = request;

  return (
    <div className="post-request-card">

      {/* ── Author row ── */}
      <div className="pr-author-row">
        <div className="pr-author-left">
          <img src={avatar} alt={name} className="pr-avatar" />
          <Link to={`/profile/${user}`} className="pr-author-name">{name}</Link>
        </div>
        <span className="pr-date"><Moment fromNow>{date}</Moment></span>
      </div>

      {/* ── Content ── */}
      <div className="pr-body">
        <h3 className="pr-heading">{heading}</h3>

        <div className="pr-text">{parse(sanitizeHtml(text))}</div>

        {images?.length > 0 && (
          <div className="pr-images">
            {images.map((img) => (
              <img
                key={img}
                src={`https://alumni-nrvg.onrender.com/awards/${img}`}
                alt="post"
                className="pr-image"
              />
            ))}
          </div>
        )}

        <div className="pr-meta">
          <span className="pr-channel-tag"># {channel}</span>
          <div className="pr-visibility-tags">
            {visibility.map((item) => (
              <span key={item} className="pr-vis-tag">{item}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="pr-actions">
        <button
          className="action-button-request-card approve-button"
          onClick={() => approvePostRequest(request._id)}
        >
          <i className="fa fa-check" /> Approve
        </button>
        <button
          className="action-button-request-card reject-button"
          onClick={() => rejectPostRequest(request._id)}
        >
          <i className="fa fa-times" /> Decline
        </button>
      </div>

    </div>
  );
};

PostRequestCard.propTypes = {
  request: PropTypes.object.isRequired,
  approvePostRequest: PropTypes.func.isRequired,
  rejectPostRequest: PropTypes.func.isRequired,
};

export default connect(null, { approvePostRequest, rejectPostRequest })(PostRequestCard);