// src/components/messenger/ConversationSidebar.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useHistory, useLocation } from "react-router-dom";
import { connect } from "react-redux";
import { getConversations } from "../../actions/chat";
import { notificationStore } from "../../socket";
import "./sidebar.css";

const BASE = process.env.REACT_APP_BACKEND_URL || "";

// ── Helpers ──────────────────────────────────────────────────────────────────

function truncate(str, max = 30) {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60)    return "now";
  if (diff < 3600)  return Math.floor(diff / 60) + "m";
  if (diff < 86400) return Math.floor(diff / 3600) + "h";
  return Math.floor(diff / 86400) + "d";
}

function Avatar({ src, name, size = 42, online = false }) {
  const colors = ["#1a2f54","#25468a","#0d5e3a","#6d28d9","#92400e","#0369a1"];
  const ci = name ? name.charCodeAt(0) % colors.length : 0;
  const initial = name ? name[0].toUpperCase() : "?";

  return (
    <div style={{ position: "relative", flexShrink: 0, width: size, height: size }}>
      {src ? (
        <img
          src={src}
          alt={name}
          className="chat-item-avatar"
          style={{ width: size, height: size }}
          onError={(e) => { e.target.style.display = "none"; }}
        />
      ) : (
        <div
          className="chat-item-avatar"
          style={{
            width: size, height: size,
            background: colors[ci],
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 700, fontSize: size * 0.38,
          }}
        >
          {initial}
        </div>
      )}
      {online && <span className="online-dot" />}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const ConversationSidebar = ({
  auth: { authUser },
  chat: { conversations, onlineUsers },
  getConversations,
}) => {
  const [search,    setSearch]    = useState("");
  const [unreadMap, setUnreadMap] = useState({});
  const [, forceUpdate]           = useState({});
  const history  = useHistory();
  const location = useLocation();

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authUser?._id) return;

    // GET /api/conversations — returns all DM + group convs with lastMessage
    getConversations();

    // Unread counts from backend
    const fetchUnread = async () => {
      try {
        const res = await axios.get(`${BASE}/api/conversations/unread-count/${authUser._id}`);
        setUnreadMap(res.data || {});
      } catch (_) {}
    };
    fetchUnread();

    // Legacy notificationStore badge
    const unsub = notificationStore.subscribe(() => forceUpdate({}));
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?._id]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getOther = (conv) =>
    (conv.members || []).find(
      (m) => (m._id || m).toString() !== authUser?._id?.toString()
    );

  const isOnline = (userId) =>
    Array.isArray(onlineUsers) && onlineUsers.includes(userId?.toString());

  const getUnread = (conv) =>
    unreadMap[conv._id] || (notificationStore.hasUnread(conv._id) ? 1 : 0);

  const isActive = (convId) => location.pathname.includes(convId);

  // ── Derived lists ──────────────────────────────────────────────────────────
  const dmConvs    = conversations.filter((c) => !c.isGroup);
  const groupConvs = conversations.filter((c) =>  c.isGroup);

  const filteredDMs = dmConvs.filter((c) => {
    const other = getOther(c);
    return (other?.name || "").toLowerCase().includes(search.toLowerCase());
  });

  const filteredGroups = groupConvs.filter((g) =>
    (g.groupName || "").toLowerCase().includes(search.toLowerCase())
  );

  // ── Last message display ───────────────────────────────────────────────────
  const lastMsgText = (conv) => {
    const lm = conv.lastMessage;
    if (!lm) return "";
    // New backend: lastMessage is a plain string preview
    if (typeof lm === "string") return lm;
    // Old shape (object): fallback
    if (lm.mediaType && !lm.text) return "📎 Attachment";
    const prefix = lm.sender?.toString() === authUser?._id?.toString() ? "You: " : "";
    return prefix + truncate(lm.text || "", 28);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="sidebar-container">

      {/* Search */}
      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Search conversations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── Direct Messages ── */}
      <div className="sidebar-category">Direct Messages</div>

      {filteredDMs.length === 0 ? (
        <p className="empty-text">No conversations yet</p>
      ) : (
        filteredDMs.map((conv) => {
          const other   = getOther(conv);
          const otherId = other?._id || other;
          const name    = other?.name || "Unknown";
          const avatar  = other?.avatar;
          const online  = isOnline(otherId);
          const unread  = getUnread(conv);
          const lmTime  = conv.lastMessageAt || conv.updatedAt;

          return (
            <div
              key={conv._id}
              className={`chat-list-item${isActive(conv._id) ? " active" : ""}`}
              onClick={() => history.push(`/messenger/chat/${conv._id}`)}
            >
              <Avatar src={avatar} name={name} size={50} online={online} />

              <div className="chat-item-info">
                <p className="chat-item-name">{name}</p>
                <p className="chat-item-last">{lastMsgText(conv)}</p>
              </div>

              <div className="chat-item-meta">
                {lmTime && (
                  <span className="chat-item-time">{timeAgo(lmTime)}</span>
                )}
                {unread > 0 && (
                  <span className="unread-badge">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* ── Groups ── */}
      <div className="sidebar-category">Groups</div>

      {filteredGroups.length === 0 ? (
        <p className="empty-text">No groups yet</p>
      ) : (
        filteredGroups.map((group) => {
          const unread = getUnread(group);
          const lmTime = group.lastMessageAt || group.updatedAt;

          return (
            <Link
              key={group._id}
              to={`/messenger/group/${group._id}`}
              className={`chat-list-item${isActive(group._id) ? " active" : ""}`}
            >
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div className="chat-item-avatar group-avatar" style={{ width: 50, height: 50, fontSize: "1.1rem" }}>
                  {(group.groupName || "G")[0].toUpperCase()}
                </div>
              </div>

              <div className="chat-item-info">
                <p className="chat-item-name">{group.groupName}</p>
                <p className="chat-item-last">{lastMsgText(group)}</p>
              </div>

              <div className="chat-item-meta">
                {lmTime && (
                  <span className="chat-item-time">{timeAgo(lmTime)}</span>
                )}
                {unread > 0 && (
                  <span className="unread-badge">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  chat: state.chat,
});

export default connect(mapStateToProps, { getConversations })(ConversationSidebar);