// client/src/hooks/useMessengerSocket.js
//
// Drop-in hook. Mount once in <Messenger> after login.
// Handles: connect, addUser, all inbound events → Redux,
//          expose helpers: joinConv, leaveConv, emitTypingStart, emitTypingStop, emitSendMessage
//
import { useEffect, useRef, useCallback } from "react";
import { useDispatch } from "react-redux";
import { socket } from "../socket"; // your existing socket singleton
import {
  MESSAGE_RECEIVED,
  MESSAGE_EDITED,
  MESSAGE_DELETED,
  REACTION_UPDATED,
  MESSAGES_READ,
  CONVERSATION_UPDATED,
  USER_WENT_ONLINE,
  USER_WENT_OFFLINE,
  SET_TYPING,
  CLEAR_TYPING,
} from "../actions/types";

export function useMessengerSocket(authUser) {
  const dispatch = useDispatch();
  const typingTimers = useRef({}); // convId → timer handle

  // ─── connect & register user ───────────────────────────────────────────────
  useEffect(() => {
    if (!authUser?._id) return;

    if (!socket.connected) socket.connect();
    socket.emit("addUser", authUser._id);

    return () => {
      // Do NOT call socket.disconnect() here — other parts of the app (friend
      // requests, notifications) share the same socket. Only disconnect on
      // full logout, which you handle in your auth flow.
    };
  }, [authUser?._id]);

  // ─── inbound event listeners ───────────────────────────────────────────────
  useEffect(() => {
    if (!authUser?._id) return;

    const onNewMessage = (msg) => {
      dispatch({ type: MESSAGE_RECEIVED, payload: msg });
      // also bump lastMessage on the conversation in sidebar
      dispatch({
        type: CONVERSATION_UPDATED,
        payload: {
          _id: msg.conversation,
          lastMessage: msg,
          lastMessageAt: msg.createdAt,
        },
      });
    };

    const onMessagesRead = (data) => {
      // data: { convId, userId, readAt }
      dispatch({ type: MESSAGES_READ, payload: data });
    };

    const onReactionUpdated = (msg) => {
      dispatch({ type: REACTION_UPDATED, payload: msg });
    };

    const onMessageEdited = (msg) => {
      dispatch({ type: MESSAGE_EDITED, payload: msg });
    };

    const onMessageDeleted = ({ msgId }) => {
      dispatch({ type: MESSAGE_DELETED, payload: { _id: msgId, forEveryone: true } });
    };

    const onTypingStart = ({ convId, userId }) => {
      if (userId === authUser._id) return;
      dispatch({ type: SET_TYPING, payload: { convId, userId } });
    };

    const onTypingStop = ({ convId, userId }) => {
      dispatch({ type: CLEAR_TYPING, payload: { convId, userId } });
    };

    const onUserOnline = (userId) => {
      dispatch({ type: USER_WENT_ONLINE, payload: userId });
    };

    const onUserOffline = (userId) => {
      dispatch({ type: USER_WENT_OFFLINE, payload: userId });
    };

    const onConvUpdated = (conv) => {
      dispatch({ type: CONVERSATION_UPDATED, payload: conv });
    };

    socket.on("new_message",          onNewMessage);
    socket.on("messages_read",        onMessagesRead);
    socket.on("reaction_updated",     onReactionUpdated);
    socket.on("message_edited",       onMessageEdited);
    socket.on("message_deleted",      onMessageDeleted);
    socket.on("typing_start",         onTypingStart);
    socket.on("typing_stop",          onTypingStop);
    socket.on("user_online",          onUserOnline);
    socket.on("user_offline",         onUserOffline);
    socket.on("conversation_updated", onConvUpdated);

    // Keep legacy receiveMessage for backwards compat with existing sendMessage handler
    socket.on("receiveMessage", onNewMessage);

    return () => {
      socket.off("new_message",          onNewMessage);
      socket.off("messages_read",        onMessagesRead);
      socket.off("reaction_updated",     onReactionUpdated);
      socket.off("message_edited",       onMessageEdited);
      socket.off("message_deleted",      onMessageDeleted);
      socket.off("typing_start",         onTypingStart);
      socket.off("typing_stop",          onTypingStop);
      socket.off("user_online",          onUserOnline);
      socket.off("user_offline",         onUserOffline);
      socket.off("conversation_updated", onConvUpdated);
      socket.off("receiveMessage",       onNewMessage);
    };
  }, [authUser?._id, dispatch]);

  // ─── helpers exposed to components ────────────────────────────────────────

  const joinConv = useCallback((convId) => {
    socket.emit("join_conversation", { convId });
    // keep legacy joinGroup so existing server handler also fires
    socket.emit("joinGroup", convId);
  }, []);

  const leaveConv = useCallback((convId) => {
    socket.emit("leave_conversation", { convId });
    socket.emit("leaveGroup", convId);
  }, []);

  const emitTypingStart = useCallback((convId) => {
    socket.emit("typing_start", { convId });
  }, []);

  const emitTypingStop = useCallback((convId) => {
    socket.emit("typing_stop", { convId });
  }, []);

  /**
   * Debounced typing emitter. Call this on every keystroke.
   * Emits typing_start immediately (if not already), then
   * auto-emits typing_stop after 1000ms of silence.
   */
  const notifyTyping = useCallback((convId) => {
    if (!typingTimers.current[convId]) {
      emitTypingStart(convId);
    }
    clearTimeout(typingTimers.current[convId]);
    typingTimers.current[convId] = setTimeout(() => {
      emitTypingStop(convId);
      delete typingTimers.current[convId];
    }, 1000);
  }, [emitTypingStart, emitTypingStop]);

  /** Emit legacy sendMessage for the existing server handler */
  const emitSendMessage = useCallback((payload) => {
    socket.emit("sendMessage", payload);
  }, []);

  return { joinConv, leaveConv, notifyTyping, emitSendMessage };
}