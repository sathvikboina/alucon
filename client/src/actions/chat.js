// client/src/actions/chat.js  ← full replacement
import axios from "axios";
import {
  GET_CONVERSATIONS,
  GET_MESSAGES,
  MESSAGE_SENT,
  MESSAGES_PREPEND,
  MESSAGE_EDITED,
  MESSAGE_DELETED,
  REACTION_UPDATED,
  CONVERSATION_UPDATED,
  SET_HAS_MORE,
} from "./types";

const BASE = process.env.REACT_APP_BACKEND_URL || "";

// ─── Conversations ────────────────────────────────────────────────────────────

/** GET /api/conversations  →  sidebar list with lastMessage */
export const getConversations = () => async (dispatch) => {
  try {
    const res = await axios.get(`${BASE}/api/conversations`);
    dispatch({ type: GET_CONVERSATIONS, payload: res.data });
  } catch (err) {
    console.error("getConversations:", err);
  }
};

/** GET /api/conversations/unread-count/:userId  (per-conversation unread) */
export const getUnreadCount = (userId) => async () => {
  try {
    const res = await axios.get(`${BASE}/api/conversations/unread-count/${userId}`);
    return res.data; // { [convId]: count }
  } catch (err) {
    console.error("getUnreadCount:", err);
    return {};
  }
};

/** PUT /api/conversations/mute/:convId */
export const muteConversation = (convId) => async (dispatch) => {
  try {
    const res = await axios.put(`${BASE}/api/conversations/mute/${convId}`);
    dispatch({ type: CONVERSATION_UPDATED, payload: res.data });
  } catch (err) {
    console.error("muteConversation:", err);
  }
};

// ─── Messages ─────────────────────────────────────────────────────────────────

/**
 * Initial load: GET /api/messages/:convId?limit=30
 * Returns { messages, hasMore }
 */
export const getMessages = (convId) => async (dispatch) => {
  try {
    const res = await axios.get(`${BASE}/api/messages/${convId}?limit=30`);
    // backend returns { messages, hasMore } — handle both old and new shape
    const { messages = res.data, hasMore = false } = res.data?.messages
      ? res.data
      : { messages: res.data, hasMore: false };

    dispatch({ type: GET_MESSAGES, payload: messages });
    dispatch({ type: SET_HAS_MORE, payload: hasMore });
  } catch (err) {
    console.error("getMessages:", err);
  }
};

/**
 * Load older page: GET /api/messages/:convId?before=<ISO>&limit=30
 * Prepends to existing list.
 */
export const loadOlderMessages = (convId, beforeISO) => async (dispatch) => {
  try {
    const res = await axios.get(
      `${BASE}/api/messages/${convId}?before=${encodeURIComponent(beforeISO)}&limit=30`
    );
    const { messages = res.data, hasMore = false } = res.data?.messages
      ? res.data
      : { messages: res.data, hasMore: false };

    dispatch({ type: MESSAGES_PREPEND, payload: messages });
    dispatch({ type: SET_HAS_MORE, payload: hasMore });
    return messages.length; // let caller know how many were added
  } catch (err) {
    console.error("loadOlderMessages:", err);
    return 0;
  }
};

/** POST /api/messages/send */
export const sendMessage = (payload) => async (dispatch) => {
  try {
    const res = await axios.post(`${BASE}/api/messages/send`, payload);
    dispatch({ type: MESSAGE_SENT, payload: res.data });
    return res.data;
  } catch (err) {
    console.error("sendMessage:", err);
    throw err; // let component handle 403 blocked
  }
};

/** PUT /api/messages/read/:convId  — mark all as read */
export const markRead = (convId) => async () => {
  try {
    await axios.put(`${BASE}/api/messages/read/${convId}`);
  } catch (err) {
    console.error("markRead:", err);
  }
};

/** PUT /api/messages/react/:msgId  { emoji } */
export const reactToMessage = (msgId, emoji) => async (dispatch) => {
  try {
    const res = await axios.put(`${BASE}/api/messages/react/${msgId}`, { emoji });
    dispatch({ type: REACTION_UPDATED, payload: res.data });
  } catch (err) {
    console.error("reactToMessage:", err);
  }
};

/** PUT /api/messages/edit/:msgId  { text } */
export const editMessage = (msgId, text) => async (dispatch) => {
  try {
    const res = await axios.put(`${BASE}/api/messages/edit/${msgId}`, { text });
    dispatch({ type: MESSAGE_EDITED, payload: res.data });
  } catch (err) {
    console.error("editMessage:", err);
  }
};

/**
 * DELETE /api/messages/delete/:msgId?forEveryone=true|false
 * forEveryone=true  → removes for all members
 * forEveryone=false → adds current user to deletedFor[]
 */
export const deleteMessage = (msgId, forEveryone = false) => async (dispatch) => {
  try {
    await axios.delete(
      `${BASE}/api/messages/delete/${msgId}?forEveryone=${forEveryone}`
    );
    dispatch({ type: MESSAGE_DELETED, payload: { _id: msgId, forEveryone } });
  } catch (err) {
    console.error("deleteMessage:", err);
  }
};

// ─── Media upload (two-step flow) ─────────────────────────────────────────────

/**
 * POST /api/upload/single  (existing route, unchanged)
 * Returns { url, mediaType, originalName }
 */
export const uploadMedia = (file) => async () => {
  const form = new FormData();
  form.append("file", file);
  const res = await axios.post(`${BASE}/api/upload`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data; // { url, mediaType, originalName }
};