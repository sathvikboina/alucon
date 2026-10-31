// src/socket.js
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_BACKEND_URL;
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  // Send the JWT with the handshake so the server can verify identity and
  // enforce conversation membership before joining any room.
  auth: (cb) => cb({ token: localStorage.getItem("token") }),
});

// A simple global state to track unread messages without Redux boilerplate
class NotificationStore {
  constructor() {
    this.unreadMessages = new Map(); // convId -> message count
    this.unreadSenders = new Set();  // senderIds that have unread messages
    this.listeners = [];
  }

  addUnread(convId, senderId) {
    const currentCount = this.unreadMessages.get(convId) || 0;
    this.unreadMessages.set(convId, currentCount + 1);
    if (senderId) {
      this.unreadSenders.add(senderId);
    }
    this.notify();
  }

  clearUnread(id) {
    this.unreadMessages.delete(id);
    this.unreadSenders.delete(id); 
    this.notify();
  }

  getUnreadCount() {
    let total = 0;
    this.unreadMessages.forEach(count => {
      total += count;
    });
    return total;
  }

  hasUnread(id) {
    return this.unreadMessages.has(id) || this.unreadSenders.has(id);
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(l => l(this));
  }
}

export const notificationStore = new NotificationStore();

// Globally listen for messages if socket is connected
socket.on("receiveMessage", (data) => {
  // Check if we are currently looking at this conversation
  const currentPath = window.location.pathname;
  if (!currentPath.includes(data.conversationId)) {
    // If it's a group message, only light up the Group dot, not the individual sender's dot!
    const senderToLightUp = data.isGroup ? null : data.senderId;
    notificationStore.addUnread(data.conversationId, senderToLightUp);
  }
});