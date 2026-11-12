import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { getPosts, createPost } from "../../actions/post";
import { connect } from "react-redux";
import PostCard from "./PostCard";
import { Link, useLocation } from "react-router-dom";
import { Modal, Box } from "@mui/material";
import { closeSideNav } from "../../actions/alert";
import { getAllChannels, createChannel } from "../../actions/channel";
import api from "../../utils/api";
import { flushFeedEvents, observeFeed, resetFeedRecommendations, trackFeedEvent } from "../../utils/feedTracking";
import "./Posts.css";
import "../layouts/Settings.css";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const initialsOf = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "II";

// The originals store post bodies as HTML. The inline composer is plain text,
// so convert paragraphs/line breaks without trusting raw input as markup.
const toHtml = (value) =>
  value
    .split(/\n{2,}/)
    .map(
      (para) =>
        `<p>${para
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br/>")}</p>`
    )
    .join("");

const formatEventDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    month: date.toLocaleDateString("en-IN", { month: "short" }).toUpperCase(),
    day: date.toLocaleDateString("en-IN", { day: "2-digit" }),
    time: date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }),
  };
};

const Posts = ({
  getPosts,
  closeSideNav,
  getAllChannels,
  createChannel,
  createPost,
  post: { posts, loading },
  auth: { authUser },
  extras: { channels },
  match,
}) => {
  const query = useQuery();
  const initialSearch = query.get("search") || "";

  let rawChannel = match?.params?.channel_name;
  if (rawChannel === "undefined") rawChannel = "";
  const channelName = decodeURIComponent(rawChannel || "").trim();

  const [search, setSearch] = useState(initialSearch);
  const [mode, setMode] = useState("for-you");
  const [activeQuery, setActiveQuery] = useState(initialSearch);
  const [rankedPosts, setRankedPosts] = useState(null);
  const [feedMeta, setFeedMeta] = useState(null);
  const [feedStale, setFeedStale] = useState(false);
  const [topPosts, setTopPosts] = useState(null);
  const [topMeta, setTopMeta] = useState(null);
  const [topLoading, setTopLoading] = useState(false);
  const [topError, setTopError] = useState("");
  const [topRange, setTopRange] = useState("week");
  const [topFrom, setTopFrom] = useState("");
  const [topTo, setTopTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const streamRef = useRef(null);

  const [composerOpen, setComposerOpen] = useState(false);
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("community");
  const [composerChannel, setComposerChannel] = useState("");
  const [composerError, setComposerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [open, setOpen] = useState(false);
  const [newChannelName, setChannelName] = useState("");

  const [people, setPeople] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const loadRankedFeed = useCallback(async () => {
    try {
      const { data } = await api.get("/api/feed/for-you", {
        params: { limit: 50 },
      });
      setRankedPosts(Array.isArray(data?.posts) ? data.posts : null);
      setFeedMeta(data?.meta || null);
    } catch (error) {
      // Personalisation is additive; the chronological redux feed remains.
      setRankedPosts(null);
      setFeedMeta(null);
    }
  }, []);

  useEffect(() => {
    if (activeQuery || channelName) return;
    loadRankedFeed();
  }, [activeQuery, channelName, loadRankedFeed]);

  const loadTopFeed = useCallback(async () => {
    if (topRange === "custom" && (!appliedFrom || !appliedTo)) {
      setTopPosts([]);
      setTopMeta(null);
      setTopLoading(false);
      return;
    }
    setTopLoading(true);
    setTopError("");
    try {
      const params = { range: topRange, limit: 50 };
      if (channelName) params.channel = channelName;
      if (topRange === "custom") {
        params.from = appliedFrom;
        params.to = appliedTo;
      }
      const { data } = await api.get("/api/feed/top", { params });
      setTopPosts(Array.isArray(data?.posts) ? data.posts : []);
      setTopMeta(data?.meta || null);
    } catch (err) {
      setTopPosts([]);
      setTopMeta(null);
      setTopError(
        err?.response?.data?.msg || "Could not load the top posts right now."
      );
    } finally {
      setTopLoading(false);
    }
  }, [topRange, appliedFrom, appliedTo, channelName]);

  useEffect(() => {
    if (mode !== "top" || activeQuery) return;
    loadTopFeed();
  }, [mode, activeQuery, loadTopFeed]);

  const handleApplyCustomRange = () => {
    if (!topFrom || !topTo) {
      setTopError("Choose both a start and an end date.");
      return;
    }
    if (new Date(topFrom).getTime() > new Date(topTo).getTime()) {
      setTopError("The start date must be before the end date.");
      return;
    }
    setTopError("");
    setAppliedFrom(topFrom);
    setAppliedTo(topTo);
  };

  useEffect(() => {
    const markStale = () => setFeedStale(true);
    window.addEventListener("feed:engagement", markStale);
    return () => window.removeEventListener("feed:engagement", markStale);
  }, []);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("alumni:feed-stale") === "1") {
        setFeedStale(true);
        sessionStorage.removeItem("alumni:feed-stale");
      }
    } catch (error) {
      // Storage unavailable; nothing to restore.
    }
  }, []);

  useEffect(() => {
    closeSideNav();
    getAllChannels();
  }, [closeSideNav, getAllChannels]);

  // Empty channel means "all posts" now, matching the prototype home feed.
  useEffect(() => {
    getPosts(initialSearch, channelName);
  }, [channelName, initialSearch, getPosts]);

  useEffect(() => {
    if (!composerChannel) {
      setComposerChannel(channelName || channels?.[0]?.name || "General");
    }
  }, [channelName, channels, composerChannel]);

  // Right-rail data. Both endpoints are already part of the original API.
  useEffect(() => {
    let alive = true;
    api
      .get("/api/directory/alumni")
      .then((res) => {
        if (alive) setPeople((res.data?.items || []).slice(0, 4));
      })
      .catch(() => {});

    api
      .get("/api/event/get/getevent")
      .then((res) => {
        if (!alive) return;
        const now = Date.now();
        const next = (res.data || [])
          .filter((event) => {
            const when = new Date(event.startTime || event.Event_post_date).getTime();
            return Number.isFinite(when) && when >= now;
          })
          .sort(
            (a, b) =>
              new Date(a.startTime || a.Event_post_date) -
              new Date(b.startTime || b.Event_post_date)
          )
          .slice(0, 3);
        setUpcoming(next);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  const visiblePosts = useMemo(() => {
    const list = Array.isArray(posts) ? posts : [];
    const role = String(authUser?.role || "").toLowerCase();

    let filtered = list.filter((p) => {
      if (authUser?.isAdmin) return true;
      const owns = p.user && String(p.user) === String(authUser?._id);
      const visibility = Array.isArray(p.visibility) ? p.visibility : [];
      return (
        owns ||
        visibility.length === 0 ||
        visibility.some((v) => String(v).toLowerCase() === role)
      );
    });

    if (mode === "following") {
      const following = new Set((authUser?.followings || []).map(String));
      filtered = filtered.filter(
        (p) =>
          following.has(String(p.user)) || String(p.user) === String(authUser?._id)
      );
    }

    if (mode === "latest") {
      filtered = [...filtered].sort(
        (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
      );
    }

    // Server-ranked feed for the unfiltered "For you" view. Search and topic
    // views keep the chronological API results, which are already relevance
    // ordered by Mongo's text index.
    if (
      mode === "for-you" &&
      !activeQuery &&
      !channelName &&
      rankedPosts?.length
    ) {
      // Keep the server's order and reasons, but take the latest like/comment
      // arrays from redux so a like updates the card immediately.
      const byId = new Map(list.map((post) => [String(post._id), post]));
      filtered = rankedPosts.map((post) => {
        const fresh = byId.get(String(post._id));
        return fresh ? { ...fresh, feed: post.feed } : post;
      });
    }

    // Top is ranked server-side for the chosen window. Keep that order and its
    // engagement reason, but refresh the card counts from redux after a like.
    if (mode === "top" && !activeQuery && topPosts) {
      const byId = new Map(list.map((post) => [String(post._id), post]));
      filtered = topPosts.map((post) => {
        const fresh = byId.get(String(post._id));
        return fresh ? { ...fresh, feed: post.feed } : post;
      });
    }

    return filtered;
  }, [posts, authUser, mode, activeQuery, channelName, rankedPosts, topPosts]);

  // Record impressions and dwell time for cards in the ranked feed.
  useEffect(() => {
    if (mode !== "for-you" || activeQuery || channelName) return undefined;
    return observeFeed(streamRef.current, { surface: "feed" });
  }, [mode, activeQuery, channelName, visiblePosts]);

  const channelCounts = useMemo(() => {
    const counts = {};
    (Array.isArray(posts) ? posts : []).forEach((p) => {
      if (p.channel) counts[p.channel] = (counts[p.channel] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [posts]);

  const handleSearch = (e) => {
    e.preventDefault();
    const query = search.trim();
    setActiveQuery(query);
    trackFeedEvent({ type: "search", query, surface: "feed" });
    getPosts(query, channelName);
  };

  const handleUpdateFeed = async () => {
    setFeedStale(false);
    try {
      sessionStorage.removeItem("alumni:feed-stale");
    } catch (error) {
      // Storage unavailable; the in-page state is already cleared.
    }
    // Push queued clicks/likes first, otherwise the refetch can race the batch.
    await flushFeedEvents();
    await loadRankedFeed();
    streamRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleResetFeed = async () => {
    try {
      await resetFeedRecommendations();
    } catch (error) {
      // Still clear the local view so the button always does something.
    }
    setRankedPosts(null);
    setFeedMeta(null);
    setFeedStale(false);
    try {
      sessionStorage.removeItem("alumni:feed-stale");
    } catch (error) {
      // Storage unavailable; nothing to clear.
    }
    loadRankedFeed();
  };

  const handleCompose = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!heading.trim()) {
      setComposerError("Add a short title for your post.");
      return;
    }
    if (!body.trim()) {
      setComposerError("Write something before posting.");
      return;
    }

    setComposerError("");
    setSubmitting(true);

    const visibility =
      audience === "community"
        ? { student: true, faculty: true, alumni: true }
        : {
            student: audience === "students",
            faculty: audience === "faculty",
            alumni: audience === "alumni",
          };

    const payload = {
      heading: heading.trim(),
      text: toHtml(body.trim()),
      visibleStudent: visibility.student,
      visibleFaculty: visibility.faculty,
      visibleAlumni: visibility.alumni,
      channel: (composerChannel || "General").trim(),
      images: [],
    };

    const ok = await (async () => {
      try {
        return await createPost(payload);
      } catch (err) {
        return 0;
      }
    })();

    setSubmitting(false);

    if (ok) {
      setHeading("");
      setBody("");
      setAudience("community");
      setComposerOpen(false);
      getPosts(search.trim(), channelName);
      loadRankedFeed();
    } else {
      setComposerError("Could not publish right now. Please try again.");
    }
  };

  const handleNewChannelSubmit = async () => {
    if (!newChannelName.trim()) return;
    await createChannel(newChannelName.trim());
    setChannelName("");
    setOpen(false);
    setTimeout(() => getAllChannels(), 500);
  };

  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 400,
    bgcolor: "#fff",
    borderRadius: "12px",
    boxShadow: 24,
    p: 3,
  };

  return (
    <div className="feed-container">
      <div className="feed-shell">
        {/* ── Left rail ── */}
        <aside className="feed-rail feed-rail-left">
          <nav className="rail-nav" aria-label="Feed navigation">
            <Link className="rail-nav-item active" to="/feed">
              <i className="fas fa-stream" /> Feed
            </Link>
            <Link className="rail-nav-item" to="/alumni-directory">
              <i className="fas fa-user-friends" /> People
            </Link>
            <Link className="rail-nav-item" to="/jobs">
              <i className="fas fa-briefcase" /> Opportunities
            </Link>
            <Link className="rail-nav-item" to="/resources">
              <i className="fas fa-book-open" /> Resources
            </Link>
            <Link className="rail-nav-item" to="/events">
              <i className="fas fa-calendar-alt" /> Events
            </Link>
            {/* Ask IIITA (generic chat) is parked until the cited-search phase. */}
          </nav>

          {channelCounts.length > 0 && (
            <div className="rail-section">
              <p className="rail-eyebrow">Active topics</p>
              <div className="rail-topics">
                {channelCounts.map(([name, count]) => (
                  <Link
                    key={name}
                    to={`/feed/topic/${encodeURIComponent(name)}?search=`}
                    className={`rail-topic ${channelName === name ? "active" : ""}`}
                  >
                    <span>{name}</span>
                    <em>{count}</em>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {authUser && (
            <div className="rail-profile">
              <img
                src={(authUser.avatar || "").replace("d=mm", "d=404")}
                alt={authUser.name}
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
              <div>
                <strong>{authUser.name}</strong>
                <small>
                  {authUser.role || "Member"}
                  {authUser.isAdmin ? " · Admin" : ""}
                </small>
              </div>
            </div>
          )}
        </aside>

        {/* ── Feed column ── */}
        <main className="feed-main-area">
          <div className="feed-hero">
            <div className="feed-hero-left">
              <h2>{channelName ? `# ${channelName}` : "Home"}</h2>
              <p>
                {channelName
                  ? `${visiblePosts.length} post${visiblePosts.length === 1 ? "" : "s"} in this topic`
                  : "Everything happening across the IIIT community"}
              </p>
            </div>

            <div className="feed-hero-right">
              {authUser && authUser.isAdmin && (
                <button
                  className="create-btn"
                  onClick={() => setOpen(true)}
                  style={{ background: "#4f46e5", marginRight: "10px" }}
                >
                  + Channel
                </button>
              )}
              <form className="search-box" onSubmit={handleSearch}>
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button type="submit">Search</button>
              </form>
            </div>
          </div>

          {/* ── Composer ── */}
          <section className="composer-card">
            <div className="composer-avatar" aria-hidden="true">
              {initialsOf(authUser?.name)}
            </div>
            <form className="composer-form" onSubmit={handleCompose}>
              <input
                className="composer-title"
                placeholder="Title"
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                onFocus={() => setComposerOpen(true)}
                maxLength={140}
              />
              <textarea
                className="composer-text"
                placeholder="What's happening in the IIIT community?"
                rows={composerOpen ? 4 : 2}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onFocus={() => setComposerOpen(true)}
                maxLength={12000}
              />

              {composerOpen && (
                <div className="composer-meta">
                  <label>
                    Audience
                    <select
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                    >
                      <option value="community">IIIT community</option>
                      <option value="students">Students</option>
                      <option value="alumni">Alumni</option>
                      <option value="faculty">Faculty</option>
                    </select>
                  </label>
                  <label>
                    Topic
                    <select
                      value={composerChannel}
                      onChange={(e) => setComposerChannel(e.target.value)}
                    >
                      {channels?.length > 0 ? (
                        channels.map((c) => (
                          <option key={c._id} value={c.name}>
                            {c.name}
                          </option>
                        ))
                      ) : (
                        <option value="General">General</option>
                      )}
                    </select>
                  </label>
                </div>
              )}

              {composerError && (
                <p className="composer-error" role="alert">
                  {composerError}
                </p>
              )}

              <div className="composer-actions">
                <span className="composer-hint">
                  Shared with the selected audience.
                </span>
                <div className="composer-buttons">
                  <button
                    className="create-btn"
                    type="submit"
                    disabled={submitting}
                  >
                    {submitting ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>
            </form>
          </section>

          {/* ── Mode tabs ── */}
          <div className="feed-tabs-row">
            <div className="feed-tabs" role="tablist" aria-label="Feed mode">
              {[
                ["for-you", "For you"],
                ["latest", "Latest"],
                ["top", "Top"],
                ["following", "Following"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`feed-tab ${mode === value ? "active" : ""}`}
                  onClick={() => setMode(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === "for-you" && !activeQuery && !channelName && (
              <div className="feed-tabs-meta">
                <span
                  className={`feed-personalized ${
                    feedMeta?.personalized ? "" : "muted"
                  }`}
                >
                  {feedMeta?.personalized ? "✦ Personalized" : "Learning your feed"}
                </span>
                {feedStale && (
                  <button
                    type="button"
                    className="feed-update"
                    onClick={handleUpdateFeed}
                  >
                    Update feed
                  </button>
                )}
                <button
                  type="button"
                  className="feed-reset"
                  onClick={handleResetFeed}
                  title="Delete your feed history and start over"
                >
                  Reset
                </button>
              </div>
            )}
          </div>

          {mode === "top" && !activeQuery && (
            <div className="top-filter" aria-label="Top posts time filter">
              <span className="top-filter-label">Time</span>
              <select
                value={topRange}
                onChange={(e) => setTopRange(e.target.value)}
                aria-label="Top posts time range"
              >
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
                <option value="year">This year</option>
                <option value="all">All time</option>
                <option value="custom">Custom…</option>
              </select>

              {topRange === "custom" && (
                <>
                  <input
                    type="date"
                    value={topFrom}
                    max={topTo || undefined}
                    onChange={(e) => setTopFrom(e.target.value)}
                    aria-label="From date"
                  />
                  <span className="top-filter-label">to</span>
                  <input
                    type="date"
                    value={topTo}
                    min={topFrom || undefined}
                    onChange={(e) => setTopTo(e.target.value)}
                    aria-label="To date"
                  />
                  <button
                    type="button"
                    className="top-filter-apply"
                    onClick={handleApplyCustomRange}
                  >
                    Apply
                  </button>
                </>
              )}

              <span className="top-filter-range">
                {topLoading
                  ? "Ranking…"
                  : topMeta
                  ? `${topMeta.count} post${topMeta.count === 1 ? "" : "s"} · ranked by engagement`
                  : ""}
              </span>

              {topError && (
                <p className="top-filter-error" role="alert">
                  {topError}
                </p>
              )}
            </div>
          )}

          {/* ── Topic filter ── */}
          <div className="channel-strip">
            <Link
              to="/feed?search="
              className={`channel-pill channel-pill-all ${!channelName ? "active" : ""}`}
            >
              All
            </Link>
            {channels?.map((c) => (
              <Link
                key={c._id}
                to={`/feed/topic/${encodeURIComponent(c.name)}?search=`}
                className={`channel-pill ${channelName === c.name ? "active" : ""}`}
                onClick={() =>
                  trackFeedEvent({
                    type: "topic_view",
                    channel: c.name,
                    surface: "feed",
                  })
                }
              >
                {c.name}
              </Link>
            ))}
          </div>

          {/* ── Stream ── */}
          <div className="feed-stream" ref={streamRef}>
            {(mode === "top" && !activeQuery ? topLoading : loading) ? (
              <p className="no-posts">
                {mode === "top" && !activeQuery
                  ? "Ranking the most engaged posts…"
                  : "Loading the community feed…"}
              </p>
            ) : visiblePosts.length === 0 ? (
              <p className="no-posts">
                {mode === "top" && !activeQuery
                  ? topRange === "custom" && (!appliedFrom || !appliedTo)
                    ? "Choose a custom start and end date, then Apply."
                    : "No posts in this time window yet."
                  : mode === "following"
                  ? "No posts from people you follow yet."
                  : "Nothing here yet. Be the first to post."}
              </p>
            ) : (
              visiblePosts.map((pst) => (
                <PostCard
                  key={pst._id}
                  post={pst}
                  showReason={
                    !activeQuery &&
                    (mode === "top" ||
                      (mode === "for-you" && !channelName))
                  }
                />
              ))
            )}
          </div>
        </main>

        {/* ── Right rail ── */}
        <aside className="feed-rail feed-rail-right">
          <section className="rail-card">
            <div className="rail-header">
              <h3>Who to connect with</h3>
              <Link to="/alumni-directory" className="rail-link">
                See all
              </Link>
            </div>
            {people.length === 0 ? (
              <p className="rail-empty">Alumni suggestions will show up here.</p>
            ) : (
              people.map((person) => (
                <Link
                  key={person._id}
                  to={`/profile/${person._id}`}
                  className="person-row"
                >
                  <img
                    src={(person.avatar || "").replace("d=mm", "d=404")}
                    alt={person.name}
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                  <div>
                    <strong>{person.name}</strong>
                    <small>
                      {[person.organisation, person.passing_year]
                        .filter(Boolean)
                        .join(" · ") || "IIITA alumni"}
                    </small>
                  </div>
                </Link>
              ))
            )}
          </section>

          <section className="rail-card">
            <div className="rail-header">
              <h3>Upcoming</h3>
              <Link to="/events" className="rail-link">
                Calendar
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="rail-empty">No upcoming events scheduled.</p>
            ) : (
              upcoming.map((event) => {
                const when = formatEventDate(
                  event.startTime || event.Event_post_date
                );
                return (
                  <Link
                    key={event._id}
                    to="/events"
                    className="event-row"
                  >
                    <span className="date-box">
                      <small>{when?.month}</small>
                      <strong>{when?.day}</strong>
                    </span>
                    <div>
                      <strong>{event.title}</strong>
                      <small>
                        {when?.time}
                        {event.Speaker ? ` · ${event.Speaker}` : ""}
                      </small>
                    </div>
                  </Link>
                );
              })
            )}
          </section>

          <div className="rail-footer">
            <Link to="/help">Help</Link>
            <Link to="/showcase?tab=stories">Stories</Link>
            <Link to="/showcase">Showcase</Link>
            <span>IIIT Allahabad Alumni Network</span>
          </div>
        </aside>
      </div>

      {/* Channel modal (admin) */}
      <Modal open={open} onClose={() => setOpen(false)}>
        <Box sx={style}>
          <h3 style={{ marginTop: 0 }}>Create Channel</h3>

          <input
            type="text"
            placeholder="Enter channel name"
            value={newChannelName}
            onChange={(e) => setChannelName(e.target.value)}
            className="modal-input"
          />

          <button className="btn-submit" onClick={handleNewChannelSubmit}>
            Submit
          </button>
        </Box>
      </Modal>
    </div>
  );
};

Posts.propTypes = {
  auth: PropTypes.object.isRequired,
  extras: PropTypes.object.isRequired,
  post: PropTypes.object.isRequired,
  getPosts: PropTypes.func.isRequired,
  closeSideNav: PropTypes.func.isRequired,
  getAllChannels: PropTypes.func.isRequired,
  createChannel: PropTypes.func.isRequired,
  createPost: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  post: state.post,
  auth: state.auth,
  extras: state.extras,
});

export default connect(mapStateToProps, {
  getPosts,
  closeSideNav,
  getAllChannels,
  createChannel,
  createPost,
})(Posts);
