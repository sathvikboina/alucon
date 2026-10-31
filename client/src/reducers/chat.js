// client/src/reducers/chat.js  ← full replacement
import {
  GET_CONVERSATIONS,
  GET_MESSAGES,
  MESSAGE_SENT,
  MESSAGES_PREPEND,
  MESSAGE_RECEIVED,
  MESSAGE_EDITED,
  MESSAGE_DELETED,
  REACTION_UPDATED,
  MESSAGES_READ,
  CONVERSATION_UPDATED,
  SET_ONLINE_USERS,
  USER_WENT_ONLINE,
  USER_WENT_OFFLINE,
  SET_TYPING,
  CLEAR_TYPING,
  SET_HAS_MORE,
} from "../actions/types";

const initialState = {
  conversations: [],
  messages: [],
  hasMore: false,
  loading: true,
  error: {},
  // onlineUsers: Set of user-id strings
  onlineUsers: [],
  // typing: { [convId]: [userId, ...] }
  typing: {},
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function applyMessageUpdate(messages, updated) {
  return messages.map((m) =>
    m._id === updated._id ? { ...m, ...updated } : m
  );
}

// ─── reducer ──────────────────────────────────────────────────────────────────

export default function chatReducer(state = initialState, action) {
  const { type, payload } = action;

  switch (type) {
    // ── conversations ──
    case GET_CONVERSATIONS:
      return { ...state, conversations: payload, loading: false };

    case CONVERSATION_UPDATED:
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c._id === payload._id ? { ...c, ...payload } : c
        ),
      };

    // ── messages ──
    case GET_MESSAGES:
      return { ...state, messages: payload, loading: false };

    case MESSAGES_PREPEND:
      // older messages come in from the top; de-duplicate by _id
      return {
        ...state,
        messages: [
          ...payload.filter(
            (p) => !state.messages.some((m) => m._id === p._id)
          ),
          ...state.messages,
        ],
      };

    case SET_HAS_MORE:
      return { ...state, hasMore: payload };

    case MESSAGE_SENT:
    case MESSAGE_RECEIVED:
      // avoid duplicates (optimistic + socket echo)
      if (state.messages.some((m) => m._id === payload._id)) return state;
      return { ...state, messages: [...state.messages, payload] };

    case MESSAGE_EDITED:
      return { ...state, messages: applyMessageUpdate(state.messages, payload) };

    case REACTION_UPDATED:
      return { ...state, messages: applyMessageUpdate(state.messages, payload) };

    case MESSAGE_DELETED: {
      if (payload.forEveryone) {
        return {
          ...state,
          messages: state.messages.filter((m) => m._id !== payload._id),
        };
      }
      // "delete for me" — mark locally so UI can hide it
      return {
        ...state,
        messages: state.messages.map((m) =>
          m._id === payload._id ? { ...m, _deletedForMe: true } : m
        ),
      };
    }

    case MESSAGES_READ: {
      // payload: { convId, userId, readAt }
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.conversation === payload.convId
            ? {
                ...m,
                readBy: m.readBy
                  ? [...new Set([...m.readBy, payload.userId])]
                  : [payload.userId],
              }
            : m
        ),
      };
    }

    // ── presence ──
    case SET_ONLINE_USERS:
      return { ...state, onlineUsers: payload };

    case USER_WENT_ONLINE:
      return {
        ...state,
        onlineUsers: [...new Set([...state.onlineUsers, payload])],
      };

    case USER_WENT_OFFLINE:
      return {
        ...state,
        onlineUsers: state.onlineUsers.filter((id) => id !== payload),
      };

    // ── typing ──
    case SET_TYPING: {
      const { convId, userId } = payload;
      const current = state.typing[convId] || [];
      return {
        ...state,
        typing: {
          ...state.typing,
          [convId]: [...new Set([...current, userId])],
        },
      };
    }

    case CLEAR_TYPING: {
      const { convId, userId } = payload;
      const current = state.typing[convId] || [];
      return {
        ...state,
        typing: {
          ...state.typing,
          [convId]: current.filter((id) => id !== userId),
        },
      };
    }

    default:
      return state;
  }
}