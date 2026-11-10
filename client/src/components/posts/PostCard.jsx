import React, { useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { connect } from "react-redux";
import Moment from "react-moment";
import { toggleLike, deletePost } from "../../actions/post";
import parse from "html-react-parser";
import sanitizeHtml from "../../utils/sanitizeHtml";
import api from "../../utils/api";
import { trackFeedEvent } from "../../utils/feedTracking";
import "./PostCard.css";

// TL;DR is only offered for long-form posts. Keep this in sync with
// server/services/aiInsights.js (MIN_TLDR_WORDS).
const MIN_TLDR_WORDS = 750;

const countWords = (html = "") => {
  const text = String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.split(" ").length : 0;
};

const PostCard = ({
  post: { _id, heading, text, likes, comments, date, user, avatar, name, images, channel, feed },
  auth: { loadingAuth, authUser },
  toggleLike,
  deletePost,
  showReason,
}) => {
  const isLiked = authUser && likes?.some((l) => l.user === authUser._id);
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState("");
  const [summarizing, setSummarizing] = useState(false);

  const trackClick = () =>
    trackFeedEvent({ type: "click", postId: _id, channel, surface: "feed" });

  const handleLike = () => {
    if (!isLiked) {
      trackFeedEvent({ type: "like", postId: _id, channel, surface: "feed" });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("feed:engagement"));
      }
      try {
        sessionStorage.setItem("alumni:feed-stale", "1");
      } catch (error) {
        // Storage unavailable; the in-page stale flag still works.
      }
    }
    toggleLike(_id);
  };

  const canSummarize =
    (comments?.length || 0) >= 2 && countWords(text) >= MIN_TLDR_WORDS;

  const summarize = async () => {
    setSummaryError("");
    setSummarizing(true);
    try {
      const { data } = await api.post(`/api/ai/insights/posts/${_id}/summary`);
      setSummary(data);
    } catch (err) {
      setSummaryError(
        err?.response?.data?.msg || "Could not summarize this thread."
      );
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <article
      className="post-card"
      data-post-id={_id}
      data-channel={channel || ""}
    >

      {/* Author row */}
      <div className="post-header">
        <Link to={`/profile/${user}`} className="user-info">
          <>
            <img 
              src={(avatar || "").replace('d=mm', 'd=404')} 
              alt={name} 
              className="avatar" 
              onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
              }}
            />
            <div className="avatar" style={{ display: 'none', background: "#eff6ff", alignItems: "center", justifyContent: "center", color: "#60a5fa", border: "1px solid #d8dde6" }}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="60%" height="60%">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
          </>
          <div>
            <p className="username">{name}</p>
            <p className="post-time"><Moment fromNow>{date}</Moment></p>
          </div>
        </Link>

        {!loadingAuth && authUser?._id === user && (
          <button className="delete-btn" onClick={() => deletePost(_id)} title="Delete post">
            <i className="fa fa-trash" />
          </button>
        )}
      </div>

      {showReason && feed?.reason && (
        <p className="feed-reason">
          <span aria-hidden="true">✦</span> {feed.reason}
        </p>
      )}

      {/* Full-width image */}
      {images?.length > 0 && (
        <div className="post-image-wrap">
          <img src={images[0]} alt={heading} />
        </div>
      )}

      {/* Body */}
      <div className="post-body">
        {channel && <span className="post-channel-tag"># {channel}</span>}
        <Link to={`/posts/${_id}`} className="post-title" onClick={trackClick}>{heading}</Link>
        <div className="post-text">{parse(sanitizeHtml(text))}</div>

        {summary && (
          <div className="ai-thread">
            <div className="ai-thread-head">
              <span>✦ AI TL;DR</span>
              <em>
                {summary.model === "offline" ? "offline" : "Gemini"} ·{" "}
                {summary.commentCount} replies
              </em>
            </div>
            <ul>
              {summary.tldr.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
            {summary.openQuestion && (
              <p className="ai-thread-q">
                <strong>Open question:</strong> {summary.openQuestion}
              </p>
            )}
            {summary.suggestedReply && (
              <p className="ai-thread-reply">
                <strong>Suggested reply:</strong> {summary.suggestedReply}
              </p>
            )}
          </div>
        )}
        {summaryError && <p className="ai-error">{summaryError}</p>}
      </div>

      {/* Actions */}
      <div className="post-actions">
        <button
          className={`action-btn ${isLiked ? "liked" : ""}`}
          onClick={handleLike}
        >
          👍 <span className="action-count">{likes?.length || 0}</span>
        </button>

        <Link to={`/posts/${_id}`} className="action-btn" onClick={trackClick}>
          💬 <span className="action-count">{comments?.length || 0}</span>
        </Link>

        {canSummarize && (
          <button
            type="button"
            className={`action-btn ai-action ${summary ? "active" : ""}`}
            onClick={summary ? () => setSummary(null) : summarize}
            disabled={summarizing}
            title="Summarize this thread with AI"
          >
            ✦ {summarizing ? "Reading…" : summary ? "Hide TL;DR" : "TL;DR"}
          </button>
        )}

        <Link to={`/posts/${_id}`} className="read-more-link" onClick={trackClick}>
          Read more →
        </Link>
      </div>

    </article>
  );
};

PostCard.propTypes = {
  post: PropTypes.object.isRequired,
  toggleLike: PropTypes.func.isRequired,
  deletePost: PropTypes.func.isRequired,
  showReason: PropTypes.bool,
};

PostCard.defaultProps = {
  showReason: false,
};

const mapStateToProps = (state) => ({ auth: state.auth });
export default connect(mapStateToProps, { toggleLike, deletePost })(PostCard);