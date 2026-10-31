import React, { Fragment, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { connect } from "react-redux";
import Spinner from "../layouts/Spinner";
import PropTypes from "prop-types";
import { getPost, addComment } from "../../actions/post";
import SingleComment from "./SingleComment";
import parse from "html-react-parser";
import sanitizeHtml from "../../utils/sanitizeHtml";
import NotAuthorized from "../layouts/NotAuthorized";
import { trackFeedEvent } from "../../utils/feedTracking";
import "./PostDisplay.css";
const PostDisplay = ({
  getPost,
  addComment,
  post: { post, loading },
  auth: { authUser },
  match,
}) => {
  const history = useHistory();
  const [text, setText] = useState("");

  useEffect(() => {
    getPost(match.params.id);
  }, [getPost, match.params.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    const success = await addComment(match.params.id, { text });
    if (success) {
      setText("");
      trackFeedEvent({
        type: "comment",
        postId: match.params.id,
        channel: post?.channel,
        surface: "post",
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("feed:engagement"));
      }
      // The feed is unmounted on the post page, so remember that its ranking is
      // stale and surface the "Update feed" button when the user returns.
      try {
        sessionStorage.setItem("alumni:feed-stale", "1");
      } catch (error) {
        // Storage can be unavailable in private modes; the event still counts.
      }
    }
  };

  // Loading state
  if (loading || !post || !authUser) return <Spinner />;

  // Authorization check
  const isAllowed =
    post.visibility.includes(authUser.role) ||
    post.user === authUser._id ||
    authUser.isAdmin;

  if (!isAllowed) return <NotAuthorized />;

  return (
    <div className="post-container">
      {/* Header */}
      <div className="post-header">
        <button className="back-btn" onClick={() => history.goBack()}>
          ←
        </button>
        <h3 className="post-title">{post.heading}</h3>
      </div>

      {/* Post Content */}
      <div className="post-content">
        <div className="post-text">{parse(sanitizeHtml(post.text))}</div>

        {post.images?.length > 0 && (
  <div className="post-images">
    {post.images.map((img) => (
      <img
        key={img}
        src={img}
        alt="post"
      />
    ))}
  </div>
)}
      </div>

      {/* Comments Section */}
      <div className="comments-section">
        <form className="add-comment" onSubmit={handleSubmit}>
          <>
            <img 
              src={(authUser.avatar || "").replace('d=mm', 'd=404')} 
              alt="avatar" 
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

          <input
            type="text"
            placeholder="Write a comment..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="comment-input"
          />

          <button type="submit" className="send-btn">
            ➤
          </button>
        </form>

        <div className="comment-list">
          {post.comments.map((com) => (
            <SingleComment
              key={com._id}
              comment={com}
              currentUser={authUser._id}
              postId={post._id}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

PostDisplay.propTypes = {
  getPost: PropTypes.func.isRequired,
  addComment: PropTypes.func.isRequired,
  post: PropTypes.object.isRequired,
  auth: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  post: state.post,
});

export default connect(mapStateToProps, { getPost, addComment })(PostDisplay);