import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { connect } from "react-redux";
import Spinner from "../layouts/Spinner";
import PropTypes from "prop-types";
import Moment from "react-moment";
import { getPost, addComment, toggleLike } from "../../actions/post";
import SingleComment from "./SingleComment";
import parse from "html-react-parser";
import sanitizeHtml from "../../utils/sanitizeHtml";
import NotAuthorized from "../layouts/NotAuthorized";
import { trackFeedEvent } from "../../utils/feedTracking";
import "./PostDisplay.css";

const initialsOf = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "II";

const PostAvatar = ({ src, name, className = "post-author-avatar" }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`${className} fallback`} aria-hidden="true">
        {initialsOf(name)}
      </div>
    );
  }
  return (
    <img
      src={src.replace("d=mm", "d=404")}
      alt={name || "Author"}
      className={className}
      onError={() => setFailed(true)}
    />
  );
};

const PostDisplay = ({
  getPost,
  addComment,
  toggleLike,
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

  const isLiked = post.likes?.some((like) => like.user === authUser._id);
  const commentCount = post.comments?.length || 0;

  return (
    <div className="post-page">
      <div className="post-container">
        <button className="back-btn" onClick={() => history.goBack()}>
          <span aria-hidden="true">←</span> Back
        </button>

        <article className="post-article">
          <header className="post-article-head">
            <div className="post-meta-row">
              {post.channel && (
                <span className="post-channel-tag"># {post.channel}</span>
              )}
              <span className="post-time">
                <Moment fromNow>{post.date}</Moment>
              </span>
            </div>

            <h1 className="post-title">{post.heading}</h1>

            <div className="post-author-row">
              <PostAvatar src={post.avatar} name={post.name} />
              <div className="post-author-copy">
                <strong>{post.name || "IIITA member"}</strong>
                <small>
                  <Moment format="D MMM YYYY, h:mm A">{post.date}</Moment>
                </small>
              </div>
            </div>
          </header>

          <div className="post-content">
            <div className="post-text">{parse(sanitizeHtml(post.text))}</div>

            {post.images?.length > 0 && (
              <div className="post-images">
                {post.images.map((img) => (
                  <img key={img} src={img} alt={post.heading || "post media"} />
                ))}
              </div>
            )}
          </div>

          <footer className="post-engage">
            <button
              type="button"
              className={`post-like-btn ${isLiked ? "liked" : ""}`}
              onClick={() => toggleLike(post._id)}
            >
              <span aria-hidden="true">👍</span>
              {isLiked ? "Liked" : "Like"}
              <strong>{post.likes?.length || 0}</strong>
            </button>
            <span className="post-engage-note">
              <span aria-hidden="true">💬</span>
              {commentCount} {commentCount === 1 ? "comment" : "comments"}
            </span>
          </footer>
        </article>

        <section className="comments-section">
          <h4>
            Discussion
            {commentCount > 0 && <span>{commentCount}</span>}
          </h4>

          <form className="add-comment" onSubmit={handleSubmit}>
            <PostAvatar
              src={authUser.avatar}
              name={authUser.name}
              className="avatar"
            />
            <input
              type="text"
              placeholder="Add to the discussion..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="comment-input"
            />
            <button type="submit" className="send-btn" aria-label="Post comment">
              ➤
            </button>
          </form>

          <div className="comment-list">
            {commentCount === 0 ? (
              <p className="post-comments-empty">
                No comments yet. Start the conversation.
              </p>
            ) : (
              post.comments.map((com) => (
                <SingleComment
                  key={com._id}
                  comment={com}
                  currentUser={authUser._id}
                  postId={post._id}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

PostDisplay.propTypes = {
  getPost: PropTypes.func.isRequired,
  addComment: PropTypes.func.isRequired,
  toggleLike: PropTypes.func.isRequired,
  post: PropTypes.object.isRequired,
  auth: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  post: state.post,
});

export default connect(mapStateToProps, {
  getPost,
  addComment,
  toggleLike,
})(PostDisplay);
