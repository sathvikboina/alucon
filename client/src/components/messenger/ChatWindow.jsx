// src/components/messenger/ChatWindow.jsx
import React, {
  useEffect, useLayoutEffect, useState, useRef, useCallback,
} from "react";
import { useParams, useHistory } from "react-router-dom";
import { connect } from "react-redux";
import axios from "axios";

import {
  getMessages,
  loadOlderMessages,
  sendMessage   as sendMessageAction,
  markRead,
  reactToMessage,
  editMessage   as editMessageAction,
  deleteMessage as deleteMessageAction,
  uploadMedia,
} from "../../actions/chat";

import TypingIndicator from "./TypingIndicator";
import { notificationStore } from "../../socket";
import "./chatwindow.css";

const EMOJI_LIST = ["👍","❤️","😂","😮","😢","🔥"];
const BASE = process.env.REACT_APP_BACKEND_URL || "";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(iso) {
  if (!iso) return "";
  const d   = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function sameDay(a, b) {
  if (!a || !b) return false;
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear()
      && da.getMonth()    === db.getMonth()
      && da.getDate()     === db.getDate();
}

function MediaPreview({ url, mediaType }) {
  if (!url) return null;
  if (mediaType === "image") {
    return (
      <img
        src={url}
        alt="attachment"
        className="media-thumb"
        onClick={() => window.open(url, "_blank")}
      />
    );
  }
  if (mediaType === "video") {
    return (
      <video src={url} controls className="media-thumb" style={{ maxHeight: 200 }} />
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="media-file-link">
      📎 <span style={{ textDecoration: "underline" }}>View attachment</span>
    </a>
  );
}

function Avatar({ src, name, size = 28 }) {
  const colors = ["#1a2f54","#25468a","#0d5e3a","#6d28d9","#92400e","#0369a1"];
  const ci = name ? name.charCodeAt(0) % colors.length : 0;
  const initial = name ? name[0].toUpperCase() : "?";

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="bubble-avatar"
        style={{ width: size, height: size }}
        onError={(e) => { e.target.style.display = "none"; }}
      />
    );
  }
  return (
    <div
      className="bubble-avatar"
      style={{
        width: size, height: size, background: colors[ci],
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 700, fontSize: size * 0.4,
      }}
    >
      {initial}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const ChatWindow = ({
  auth: { authUser },
  chat: { messages, hasMore, typing, onlineUsers },
  dispatch,
  getMessages,
  loadOlderMessages,
  sendMessage,
  markRead,
  reactToMessage,
  editMessage,
  deleteMessage,
  uploadMedia,
  joinConv,
  leaveConv,
  notifyTyping,
  emitSendMessage,
  onBack,
  isMobile,
}) => {
  const { id }  = useParams();
  const history = useHistory();

  // ── Conversation meta ──────────────────────────────────────────────────────
  const [chatTitle,    setChatTitle]    = useState("");
  const [chatAvatar,   setChatAvatar]   = useState(null);
  const [membersMap,   setMembersMap]   = useState({});
  const [isGroup,      setIsGroup]      = useState(false);
  const [receiverId,   setReceiverId]   = useState(null);
  const [youBlocked,   setYouBlocked]   = useState(false);
  const [blockedBy,    setBlockedBy]    = useState(false);
  const [isAdmin,      setIsAdmin]      = useState(false);
  const [groupAdmins,  setGroupAdmins]  = useState([]);
  const [showMembers,  setShowMembers]  = useState(false);

  // ── Input state ────────────────────────────────────────────────────────────
  const [text,            setText]           = useState("");
  const [uploading,       setUploading]      = useState(false);
  const [mediaFile,       setMediaFile]      = useState(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState(null);
  const fileInputRef = useRef();

  // ── UI state ───────────────────────────────────────────────────────────────
  const [showMenu,    setShowMenu]    = useState(false);
  const [editingId,   setEditingId]   = useState(null);
  const [editingText, setEditingText] = useState("");
  const [emojiFor,    setEmojiFor]    = useState(null); // msgId

  // ── Pagination ─────────────────────────────────────────────────────────────
  const [loadingOlder, setLoadingOlder] = useState(false);
  const scrollRef        = useRef();
  const prevScrollHeight = useRef(0);
  const msgsAreaRef      = useRef();


  // reactions
const [activeMsgId, setActiveMsgId] = useState(null);
const longPressRef = useRef(null);

const handlePressStart = (msgId) => {
  longPressRef.current = setTimeout(() => {
    setActiveMsgId(msgId); // long press trigger
  }, 500); // 500ms
};

const handlePressEnd = () => {
  clearTimeout(longPressRef.current);
};

const handleClickMessage = (msgId) => {
  setActiveMsgId((prev) => (prev === msgId ? null : msgId));
};

  // ── 1. Load conversation + messages ────────────────────────────────────────
  useEffect(() => {
    if (!authUser || !id) return;
    notificationStore.clearUnread(id);

    (async () => {
      try {
        const [convRes] = await Promise.all([
          axios.get(`${BASE}/api/conversations/${id}`),
          getMessages(id),
        ]);
        const conv = convRes.data;

        setIsGroup(conv.isGroup);
        setChatTitle(conv.isGroup ? conv.groupName : "");
        setYouBlocked(conv.youBlocked  || false);
        setBlockedBy(conv.blockedBy    || false);

        if (conv.isGroup && conv.groupAdmins) {
          setIsAdmin(conv.groupAdmins.includes(authUser._id.toString()));
          setGroupAdmins(conv.groupAdmins.map(String));
        }

        const map = {};
        (conv.members || []).forEach((m) => {
          map[m._id] = { name: m.name, avatar: m.avatar };
        });
        setMembersMap(map);

        if (!conv.isGroup) {
          const other = (conv.members || []).find(
            (m) => m._id.toString() !== authUser._id.toString()
          );
          if (other) {
            setReceiverId(other._id);
            setChatTitle(other.name);
            setChatAvatar(other.avatar || null);
            notificationStore.clearUnread(other._id.toString());
          }
        }

        markRead(id);
        if (joinConv) joinConv(id);
      } catch (err) {
        console.error("ChatWindow load error:", err);
      }
    })();

    return () => {
      if (leaveConv) leaveConv(id);
      notificationStore.clearUnread(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, authUser?._id]);

  // ── 2. Smart scroll ───────────────────────────────────────────────────────
  // isInitialLoad: true whenever we switch conversations; flips false after first paint
  const isInitialLoad = useRef(true);
  const prevConvId    = useRef(null);

  const isNearBottom = useCallback(() => {
    const el = msgsAreaRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  }, []);

  // useLayoutEffect fires synchronously after DOM update — guarantees the
  // scroll happens before the browser paints, so user never sees the top.
  useLayoutEffect(() => {
    if (!msgsAreaRef.current || messages.length === 0) return;

    // New conversation opened — always jump to bottom instantly
    if (isInitialLoad.current || prevConvId.current !== id) {
      msgsAreaRef.current.scrollTop = msgsAreaRef.current.scrollHeight;
      isInitialLoad.current = false;
      prevConvId.current = id;
      return;
    }

    // Existing conversation, new message arrived — only scroll if near bottom
    if (isNearBottom()) {
      msgsAreaRef.current.scrollTop = msgsAreaRef.current.scrollHeight;
    }
  }, [messages.length, id, isNearBottom]);

  // ── 3. Close dropdown on outside click ─────────────────────────────────────
  useEffect(() => {
    const close = (e) => {
      if (!e.target.closest(".chat-header-btn")) setShowMenu(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  // ── 4. Pagination on scroll ────────────────────────────────────────────────
  const handleScroll = useCallback(async (e) => {
    if (loadingOlder || !hasMore) return;
    if (e.target.scrollTop > 80) return;
    const oldest = messages[0];
    if (!oldest?.createdAt) return;

    setLoadingOlder(true);
    prevScrollHeight.current = e.target.scrollHeight;
    const added = await loadOlderMessages(id, oldest.createdAt);
    if (added > 0) {
      requestAnimationFrame(() => {
        if (msgsAreaRef.current) {
          msgsAreaRef.current.scrollTop =
            msgsAreaRef.current.scrollHeight - prevScrollHeight.current;
        }
      });
    }
    setLoadingOlder(false);
  }, [loadingOlder, hasMore, messages, id, loadOlderMessages]);

  // ── 5. Send message ─────────────────────────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() && !mediaFile) return;

    try {
      let mediaUrl = null, mediaType = null, originalName = null;

      if (mediaFile) {
        setUploading(true);
        try {
          const up = await uploadMedia(mediaFile);
          mediaUrl = up.url; mediaType = up.mediaType; originalName = up.originalName;
        } finally { setUploading(false); }
      }

      const payload = {
        conversationId: id,
        text: text.trim() || null,
        ...(mediaUrl && { media: mediaUrl, mediaType, originalName }),
      };

      const saved = await sendMessage(payload);

      if (emitSendMessage) {
        emitSendMessage({
          senderId:       authUser._id,
          receiverId:     !isGroup ? receiverId : null,
          conversationId: id,
          text:           payload.text,
          isGroup,
          groupMembers:   isGroup ? Object.keys(membersMap) : [],
          _id:            saved?._id,
        });
      }

      setText("");
      clearMedia();
    } catch (err) {
      if (err.response?.status === 403) {
        alert("🚫 You are blocked by this user.");
      } else {
        console.error("Send error:", err);
      }
    }
  };

  // ── 6. Media staging ─────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreviewUrl(URL.createObjectURL(file));
  };

  const clearMedia = () => {
    setMediaFile(null);
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    setMediaPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── 7. Edit ──────────────────────────────────────────────────────────────
  const startEdit = (msg) => {
    setEditingId(msg._id);
    setEditingText(msg.text || "");
    setEmojiFor(null);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editingText.trim()) return;
    await editMessage(editingId, editingText.trim());
    setEditingId(null);
    setEditingText("");
  };

  // ── 8. Delete ─────────────────────────────────────────────────────────────
  const handleDelete = (msgId, forEveryone) => {
    if (!window.confirm(forEveryone ? "Delete for everyone?" : "Delete for you?")) return;
    deleteMessage(msgId, forEveryone);
    setEmojiFor(null);
  };

  // ── 9. Reactions ──────────────────────────────────────────────────────────
  const handleReact = (msgId, emoji) => {
    reactToMessage(msgId, emoji);
    setEmojiFor(null);
  };

  // ── 10. Conversation actions ───────────────────────────────────────────────
  const handleClearChat = async () => {
    if (!window.confirm("Clear all messages?")) return;
    try {
      await axios.delete(`${BASE}/api/messages/clear/${id}`);
      dispatch({ type: "GET_MESSAGES", payload: [] });
      setShowMenu(false);
    } catch (err) { console.error(err); }
  };

  const handleUnfollow = async () => {
    if (!window.confirm("Unfollow this user?")) return;
    try {
      await axios.put(`${BASE}/api/users/${receiverId}/unfollow`);
      history.push("/messenger");
    } catch (err) { console.error(err); }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Leave this group?")) return;
    try {
      await axios.put(`${BASE}/api/conversations/group/leave/${id}`);
      history.push("/messenger");
    } catch (err) { console.error(err); }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm("Delete this group? This cannot be undone.")) return;
    try {
      await axios.delete(`${BASE}/api/conversations/group/delete/${id}`);
      history.push("/messenger");
    } catch (err) { console.error(err); }
  };

  // ── Typing ────────────────────────────────────────────────────────────────
  const typingUserIds = typing?.[id] || [];
  const typingNames   = typingUserIds
    .filter((uid) => uid !== authUser?._id)
    .map((uid) => membersMap[uid]?.name || "Someone");

  // ── Read receipt ──────────────────────────────────────────────────────────
  const getReadStatus = (msg) => {
    const senderId = msg.sender?._id || msg.sender;
    if (senderId?.toString() !== authUser?._id?.toString()) return null;
    const readers = (msg.readBy || []).filter(
      (uid) => uid?.toString() !== authUser?._id?.toString()
    );
    return readers.length === 0 ? "✓" : "✓✓";
  };

  // ── Online status ─────────────────────────────────────────────────────────
  const otherOnline = receiverId && Array.isArray(onlineUsers)
    && onlineUsers.includes(receiverId.toString());

  // ── Visible messages ──────────────────────────────────────────────────────
  const visible = messages.filter((m) => !m._deletedForMe);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="chat-window-shell">

      {/* ── Header ── */}
      <div className="chat-window-header">
        <div className="chat-header-left">
          {/* Back button on mobile */}
          {isMobile && onBack && (
            <button
              className="chat-back-btn"
              onClick={onBack}
              title="Back"
            >
              <i className="fas fa-arrow-left" />
            </button>
          )}
          {/* Avatar or group icon */}
          {isGroup ? (
            <div className="chat-header-avatar" style={{ fontSize: "1rem" }}>
              {(chatTitle || "G")[0].toUpperCase()}
            </div>
          ) : (
            <Avatar src={chatAvatar} name={chatTitle} size={38} />
          )}

          <div className="chat-header-info">
            <h4>{chatTitle || "Chat"}</h4>
            {!isGroup && (
              <div className="chat-header-status">
                <span className={`status-dot${otherOnline ? " online" : ""}`} />
                <span>{otherOnline ? "Active now" : "Offline"}</span>
              </div>
            )}
            {isGroup && (
              <div className="chat-header-status">
                <span>{Object.keys(membersMap).length} members</span>
              </div>
            )}
          </div>
        </div>

        <div className="chat-header-actions">
          {isGroup && (
            <button
              className="chat-header-btn"
              onClick={() => setShowMembers((p) => !p)}
              title="Group Members"
            >
              <i className="fas fa-users" />
            </button>
          )}
          <div style={{ position: "relative" }}>
            <button
              className="chat-header-btn"
              onClick={(e) => { e.stopPropagation(); setShowMenu((p) => !p); }}
              title="Options"
            >
              <i className="fas fa-ellipsis-v" />
            </button>

            {showMenu && (
              <div className="chat-dropdown" onClick={(e) => e.stopPropagation()}>
                <button className="chat-dropdown-item" onClick={handleClearChat}>
                  <i className="fas fa-eraser" /> Clear Chat
                </button>
                {!isGroup && receiverId && (
                  <button className="chat-dropdown-item danger" onClick={handleUnfollow}>
                    <i className="fas fa-user-minus" /> Unfollow
                  </button>
                )}
                {isGroup && (
                  <button className="chat-dropdown-item" onClick={handleLeaveGroup}>
                    <i className="fas fa-sign-out-alt" /> Leave Group
                  </button>
                )}
                {isGroup && isAdmin && (
                  <button className="chat-dropdown-item danger" onClick={handleDeleteGroup}>
                    <i className="fas fa-trash" /> Delete Group
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Group Members Panel ── */}
      {isGroup && showMembers && (
        <div className="group-members-panel">
          <div className="group-members-header">
            <span>Group Members ({Object.keys(membersMap).length})</span>
            <button className="group-members-close" onClick={() => setShowMembers(false)}>✕</button>
          </div>
          <div className="group-members-list">
            {Object.entries(membersMap).map(([uid, info]) => {
              const isAdminMember = groupAdmins.includes(uid);
              const isMe = uid === authUser?._id?.toString();
              return (
                <div key={uid} className="group-member-row">
                  <div className="group-member-avatar">
                    {info.avatar
                      ? <img src={info.avatar} alt={info.name} onError={(e) => { e.target.style.display="none"; }} />
                      : <span>{(info.name || "?")[0].toUpperCase()}</span>
                    }
                  </div>
                  <div className="group-member-info">
                    <span className="group-member-name">
                      {info.name || "Unknown"}{isMe ? " (You)" : ""}
                    </span>
                    {isAdminMember && (
                      <span className="group-member-badge">Admin</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      <div
        className="chat-messages-area"
        onScroll={handleScroll}
        ref={msgsAreaRef}
      >
        {loadingOlder && (
          <p className="chat-load-hint">Loading older messages…</p>
        )}
        {!hasMore && visible.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 0 12px" }}>
            <p className="chat-load-hint" style={{ margin: 0 }}>— beginning of conversation —</p>
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              fontSize: "0.7rem", color: "#6b7280",
              background: "#f0fdf4", border: "1px solid #bbf7d0",
              borderRadius: 20, padding: "3px 12px",
            }}>
              <span>🔒</span>
              <span>Messages are end-to-end encrypted</span>
            </div>
          </div>
        )}

        {visible.map((msg, idx) => {
          const senderId  = msg.sender?._id || msg.sender;
          const isMine    = senderId?.toString() === authUser?._id?.toString();
          const senderInfo = membersMap[senderId] || {};
          const reactions = msg.reactions || [];
          const readStatus = getReadStatus(msg);
          const isEditing  = editingId === msg._id;
          const showPicker = emojiFor   === msg._id;

          // Group reactions by emoji
          const reactionGroups = reactions.reduce((acc, r) => {
            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
            return acc;
          }, {});

          // Date divider
          const prevMsg   = visible[idx - 1];
          const showDate  = !sameDay(prevMsg?.createdAt, msg.createdAt);

          return (
            <React.Fragment key={msg._id || idx}>
              {showDate && (
                <div className="chat-date-divider">
                  <span>{formatDateLabel(msg.createdAt)}</span>
                </div>
              )}

              <div
  className={`chat-bubble-row${isMine ? " mine" : " theirs"}`}
  onClick={() => handleClickMessage(msg._id)}
  onMouseDown={() => handlePressStart(msg._id)}
  onMouseUp={handlePressEnd}
  onMouseLeave={handlePressEnd}
  onTouchStart={() => handlePressStart(msg._id)}
  onTouchEnd={handlePressEnd}
>

                {/* Group sender name */}
                {!isMine && isGroup && (
                  <div className="bubble-sender-name">
                    {senderInfo.name || "Unknown"}
                  </div>
                )}

                <div className="chat-bubble-inner">
                  {/* Avatar for received */}
                  {!isMine && (
                    <Avatar src={senderInfo.avatar} name={senderInfo.name} size={28} />
                  )}

                  {/* Action buttons — float above bubble via CSS position:absolute */}
                  {activeMsgId === msg._id && (
  <div className="bubble-actions">
    <button
      className="bubble-action-btn"
      onClick={() => setEmojiFor(showPicker ? null : msg._id)}
      title="React"
    >
      😊
    </button>

    {isMine && !msg.media && (
      <button
        className="bubble-action-btn"
        onClick={() => startEdit(msg)}
        title="Edit"
      >
        ✏️
      </button>
    )}

    <button
      className="bubble-action-btn"
      onClick={() => handleDelete(msg._id, isMine)}
      title={isMine ? "Delete for everyone" : "Delete for me"}
    >
      🗑
    </button>

    {showPicker && (
      <div
        className="emoji-picker"
        style={{ [isMine ? "right" : "left"]: 0 }}
      >
        {EMOJI_LIST.map((em) => (
          <button
            key={em}
            className="emoji-picker-btn"
            onClick={() => handleReact(msg._id, em)}
          >
            {em}
          </button>
        ))}
      </div>
    )}
  </div>
)}
            

                  {/* Bubble content */}
                  <div>
                    {isEditing ? (
                      <form onSubmit={submitEdit} className="bubble-edit-form">
                        <input
                          autoFocus
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="bubble-edit-input"
                        />
                        <button type="submit" className="bubble-edit-save">Save</button>
                        <button
                          type="button"
                          className="bubble-edit-cancel"
                          onClick={() => setEditingId(null)}
                        >
                          ✕
                        </button>
                      </form>
                    ) : (
                      <div className="chat-bubble">
                        {msg.media && (
                          <MediaPreview url={msg.media} mediaType={msg.mediaType} />
                        )}
                        {msg.text && (
                          <span>
                            {msg.text}
                            {msg.isEdited && (
                              <span className="chat-bubble-edited">(edited)</span>
                            )}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Reactions */}
                    {Object.keys(reactionGroups).length > 0 && (
                      <div className="bubble-reactions">
                        {Object.entries(reactionGroups).map(([emoji, count]) => (
                          <span
                            key={emoji}
                            className="reaction-chip"
                            onClick={() => handleReact(msg._id, emoji)}
                            title={`${count} reaction${count > 1 ? "s" : ""}`}
                          >
                            {emoji}{count > 1 ? ` ${count}` : ""}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Meta row */}
                    <div
                      className="bubble-meta"
                      style={{ justifyContent: isMine ? "flex-end" : "flex-start" }}
                    >
                      <span className="bubble-time">{formatTime(msg.createdAt)}</span>
                      {readStatus && (
                        <span className={`bubble-ticks${readStatus === "✓✓" ? " read" : ""}`}>
                          {readStatus}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* Typing indicator */}
        {typingNames.length > 0 && (
          <div className="chat-typing-row">
            <TypingIndicator names={typingNames} />
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* ── Input ── */}
      {isGroup && !Object.keys(membersMap).includes(authUser?._id?.toString()) ? (
        <div className="chat-blocked-notice">
          🚪 You are no longer a member of this group.
        </div>
      ) : youBlocked ? (
        <div className="chat-blocked-notice">
          You've blocked this user. Unblock them to send messages.
        </div>
      ) : blockedBy ? (
        <div className="chat-blocked-notice">
          You've been blocked by this user.
        </div>
      ) : (
        <div className="chat-input-area">
          {/* Media preview strip */}
          {mediaPreviewUrl && (
            <div className="chat-media-preview-strip">
              <img
                src={mediaPreviewUrl}
                alt="preview"
                className="chat-media-preview-img"
                onError={(e) => { e.target.style.display = "none"; }}
              />
              <span className="chat-media-preview-name">{mediaFile?.name}</span>
              <button className="remove-media-btn" onClick={clearMedia}>✕</button>
            </div>
          )}

          <form onSubmit={handleSend} className="chat-input-form">
            <button
              type="button"
              className="chat-attach-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
            >
              <i className="fas fa-paperclip" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept="image/*,video/*,application/pdf"
              onChange={handleFileChange}
            />

            <input
              type="text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (notifyTyping) notifyTyping(id);
              }}
              placeholder="Type a message…"
              className="chat-input-field"
              disabled={uploading}
            />

            <button
              type="submit"
              className="chat-send-btn"
              disabled={uploading || (!text.trim() && !mediaFile)}
            >
              {uploading
                ? <i className="fas fa-spinner fa-spin" />
                : <i className="fas fa-paper-plane" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  chat: state.chat,
});

const mapDispatchToProps = {
  getMessages,
  loadOlderMessages,
  sendMessage:   sendMessageAction,
  markRead,
  reactToMessage,
  editMessage:   editMessageAction,
  deleteMessage: deleteMessageAction,
  uploadMedia,
};

export default connect(mapStateToProps, mapDispatchToProps)(ChatWindow);