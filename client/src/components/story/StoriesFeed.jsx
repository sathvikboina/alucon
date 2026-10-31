import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { getStories, likeStory, unlikeStory, deleteStory } from "../../actions/story";
import Spinner from "../layouts/Spinner";
import PropTypes from "prop-types";
import { Link, useHistory } from "react-router-dom";
import moment from "moment";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (name = "") =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

// ─── Modal ────────────────────────────────────────────────────────────────────

const StoryModal = ({ story, onClose, onLike, onDelete, authUser }) => {
  const liked = story.likes?.some((like) => like.user === authUser?._id);
  const likeCount = story.likes?.length || 0;
  const isOwner = authUser?._id === story.user;

  const handleLike = () => {
    onLike(story._id);
  };

  const handleDelete = () => {
    if (window.confirm("Delete this story? This cannot be undone.")) {
      onDelete(story._id);
      onClose();
    }
  };

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div onClick={handleBackdrop} style={S.backdrop}>
      <div style={S.modal}>
        <button onClick={onClose} style={S.closeBtn}>✕</button>

        {story.image ? (
          <img src={story.image} alt="Story" style={S.modalImage} />
        ) : (
          <div style={S.modalImagePlaceholder}>
            <i className="fas fa-feather-alt" style={{ fontSize: "2.5rem", color: "#c4a7f7" }} />
          </div>
        )}

        <div style={S.modalBody}>
          <div style={S.modalAuthorRow}>
            <div style={S.avatar}>{getInitials(story.name)}</div>
            <div>
              <Link to={`/profile/${story.user}`} style={S.authorName}>
                {story.name}
              </Link>
              <div style={S.postDate}>{moment(story.date).format("MMM D, YYYY")}</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={handleLike} style={{
                ...S.likeBtn,
                background: liked ? "#2563eb" : "#eff6ff",
                color: liked ? "#fff" : "#1e40af",
              }}>
                {liked ? "Liked" : "Like"}
              </button>
              <span style={S.likeCount}>{likeCount}</span>
              {isOwner && (
                <button onClick={handleDelete} style={S.deleteBtn}>
                  🗑 Delete
                </button>
              )}
            </div>
          </div>

          <p style={S.modalText}>"{story.text}"</p>
        </div>
      </div>
    </div>
  );
};

// ─── Story Card ───────────────────────────────────────────────────────────────

const StoryCard = ({ story, onLike, onDelete, onClick, authUser }) => {
  const liked = story.likes?.some((like) => like.user === authUser?._id);
  const isOwner = authUser?._id === story.user;

  const handleDelete = (e) => {
    e.stopPropagation(); // prevent opening the modal
    if (window.confirm("Delete this story? This cannot be undone.")) {
      onDelete(story._id);
    }
  };

  return (
  <div
    style={S.card}
    onClick={onClick}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-4px)";
      e.currentTarget.style.boxShadow = "0 8px 28px rgba(30,64,175,0.14)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "0 2px 12px rgba(100,80,180,.08)";
    }}
  >
    {story.image ? (
      <img src={story.image} alt="Story" style={S.cardImage} />
    ) : (
      <div style={S.cardImagePlaceholder}>
        <i className="fas fa-feather-alt" style={{ fontSize: "2rem", color: "#c4a7f7" }} />
      </div>
    )}

    <div style={S.cardFooter}>
      <div style={S.authorBlock}>
        <div style={S.avatar}>{getInitials(story.name)}</div>
        <div>
          <div style={S.authorName}>{story.name}</div>
          <div style={S.postDate}>{moment(story.date).format("MMM D, YYYY")}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ ...S.likeCount, color: liked ? "#ef4444" : "#6b7280" }}>
          ❤ {story.likes?.length || 0}
        </div>
        {isOwner && (
          <button onClick={handleDelete} style={S.deleteBtn}>
            🗑
          </button>
        )}
      </div>
    </div>
  </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  // ── Hero banner (matches Alumni Directory style) ──
  hero: {
    background: "#1e3a5f",
    padding: "1.1rem 2rem",
    width: "100%",
  },
  heroInner: {
  maxWidth: 1100,
  margin: "0 auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "0.5rem",
  padding: "0 0.5rem",  // ← add this
},
  heroTitle: {
    fontSize: "1.4rem",
    fontWeight: 700,
    color: "#ffffff",
    margin: 0,
    lineHeight: 1.2,
  },
  heroSubtitle: {
    fontSize: "0.8rem",
    color: "rgba(255,255,255,0.65)",
    margin: "0.2rem 0 0",
  },
  shareBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: ".4rem 1rem",
    fontSize: ".8rem",
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
  },

  // ── Page body ──
  page: {
    background: "#f8f9fc",
    minHeight: "100vh",
  },
  container: {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "2rem 1rem 4rem",
  boxSizing: "border-box",
  width: "100%",
},
  // ── Grid ──
  grid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(min(380px, 100%), 1fr))",
  gap: "1.5rem",
  alignItems: "start",
},
  card: {
    background: "#fff",
    borderRadius: 14,
    border: "1px solid rgba(180,170,230,.18)",
    boxShadow: "0 2px 12px rgba(100,80,180,.08)",
    overflow: "hidden",
    cursor: "pointer",
    transition: "all 0.22s ease",
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  cardImage: {
  width: "100%",
  height: "clamp(180px, 40vw, 320px)",
  objectFit: "cover",
  display: "block",
  flexShrink: 0,
},
  cardImagePlaceholder: {
    width: "100%",
    height: 320,
    background: "linear-gradient(135deg,#ede9ff,#fce4f0)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: ".75rem 1rem",
    borderTop: "1px solid rgba(180,170,230,.12)",
    background: "#fff",
  },
  authorBlock: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: ".7rem",
    fontWeight: 700,
    color: "#fff",
    flexShrink: 0,
  },
  authorName: {
    fontWeight: 600,
    fontSize: ".82rem",
    color: "#1e3a8a",
    textDecoration: "none",
  },
  postDate: {
    fontSize: ".68rem",
    color: "#9ca3af",
    marginTop: 1,
  },
  likeCount: {
    fontSize: ".76rem",
    color: "#6b7280",
  },

  // ── Modal ──
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(10,15,40,0.65)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1.5rem",
  },
  modal: {
    background: "#fff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 580,
    maxHeight: "90vh",
    overflowY: "auto",
    position: "relative",
    boxShadow: "0 24px 60px rgba(0,0,0,0.22)",
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 14,
    background: "rgba(0,0,0,0.35)",
    border: "none",
    borderRadius: "50%",
    width: 30,
    height: 30,
    color: "#fff",
    fontSize: ".85rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  modalImage: {
    width: "100%",
    height: 280,
    objectFit: "cover",
    display: "block",
    borderRadius: "16px 16px 0 0",
  },
  modalImagePlaceholder: {
    width: "100%",
    height: 180,
    background: "linear-gradient(135deg,#ede9ff,#fce4f0)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "16px 16px 0 0",
  },
  modalBody: {
    padding: "1.25rem 1.5rem 1.5rem",
  },
  modalAuthorRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: "1rem",
    paddingBottom: ".9rem",
    borderBottom: "1px solid rgba(180,170,230,.18)",
  },
  modalText: {
    fontSize: "1rem",
    lineHeight: 1.75,
    color: "#2d2a3e",
    fontFamily: "'Georgia', serif",
    fontStyle: "italic",
    margin: 0,
    paddingLeft: "1rem",
    borderLeft: "3px solid #d4bfff",
  },
  likeBtn: {
    padding: ".3rem .8rem",
    borderRadius: 6,
    border: "1px solid #c7d2fe",
    fontWeight: 600,
    fontSize: ".76rem",
    cursor: "pointer",
    transition: "all 0.15s",
  },

  deleteBtn: {
    padding: ".3rem .8rem",
    borderRadius: 6,
    border: "1px solid #fecaca",
    background: "#fff1f2",
    color: "#dc2626",
    fontWeight: 600,
    fontSize: ".76rem",
    cursor: "pointer",
    transition: "all 0.15s",
  },

  loadMoreWrap: { textAlign: "center", marginTop: "2rem" },
  loadMoreBtn: {
    border: "1px solid #c7d2fe",
    borderRadius: 6,
    color: "#1e40af",
    padding: ".55rem 1.6rem",
    cursor: "pointer",
    background: "#eff6ff",
    fontSize: ".85rem",
    fontWeight: 500,
  },
  empty: {
    textAlign: "center",
    padding: "4rem 2rem",
    color: "#6b7280",
  },
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const StoriesFeed = ({
  getStories,
  likeStory,
  deleteStory,
  story: { stories, loading },
  auth: { authUser },
}) => {
  const [page, setPage] = useState(1);
  const [allStories, setAllStories] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [selectedStory, setSelectedStory] = useState(null);
  const history = useHistory();

  useEffect(() => { getStories(page); }, [getStories, page]);

  // Accumulate incoming stories from Redux into local state
  useEffect(() => {
    if (loading) return;

    if (page === 1) {
      setAllStories(stories);
    } else {
      setAllStories((prev) => {
        const existingIds = new Set(prev.map((s) => s._id));
        const incoming = stories.filter((s) => !existingIds.has(s._id));
        return [...prev, ...incoming];
      });
    }

    setHasMore(stories.length >= PAGE_SIZE);
    setInitialLoad(false);
  }, [stories, loading, page]);

  // Remove deleted story from local state immediately (optimistic UI)
  const handleDelete = async (storyId) => {
    await deleteStory(storyId);
    setAllStories((prev) => prev.filter((s) => s._id !== storyId));
  };

  // Show spinner only on the very first load
  if (initialLoad && loading) return <Spinner />;

  return (
    <div style={S.page}>

      {/* ── Navy Blue Hero Banner ── */}
      <div style={S.hero}>
        <div style={S.heroInner}>
          <div>
            <h1 style={S.heroTitle}>Alumni Stories</h1>
            <p style={S.heroSubtitle}>Real journeys from our community of graduates</p>
          </div>
          {authUser && authUser.role === "alumni" && (
            <Link to="/stories/add" style={S.shareBtn}>
              ✍ Share Your Story
            </Link>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={S.container}>
        {allStories.length === 0 ? (
          <div style={S.empty}>No stories yet.</div>
        ) : (
          <div style={S.grid}>
            {allStories.map((story) => (
              <StoryCard
                key={story._id}
                story={story}
                onLike={likeStory}
                onDelete={handleDelete}
                onClick={() => setSelectedStory(story)}
                authUser={authUser}
              />
            ))}
          </div>
        )}

        {allStories.length > 0 && hasMore && (
          <div style={S.loadMoreWrap}>
            <button
              style={S.loadMoreBtn}
              onClick={() => setPage((p) => p + 1)}
              disabled={loading}
            >
              {loading ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>

      {selectedStory && (
        <StoryModal
          story={allStories.find(s => s._id === selectedStory._id) || selectedStory}
          onClose={() => setSelectedStory(null)}
          onLike={likeStory}
          onDelete={handleDelete}
          authUser={authUser}
        />
      )}
    </div>
  );
};

StoriesFeed.propTypes = {
  getStories: PropTypes.func.isRequired,
  likeStory: PropTypes.func.isRequired,
  deleteStory: PropTypes.func.isRequired,
  story: PropTypes.object.isRequired,
  auth: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  story: state.story,
  auth: state.auth,
});

export default connect(mapStateToProps, { getStories, likeStory, deleteStory })(StoriesFeed);