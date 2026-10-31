// src/components/messenger/TypingIndicator.jsx
import React from "react";

export default function TypingIndicator({ names = [] }) {
  if (!names.length) return null;

  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
      ? `${names[0]} and ${names[1]} are typing`
      : "Several people are typing";

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: "0.75rem",
      color: "#6b7280",
      fontStyle: "italic",
      userSelect: "none",
      padding: "2px 0",
    }}>
      {/* Animated bubble */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 3,
        background: "#f0f4fb",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "5px 10px",
      }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#9ca3af", display: "inline-block",
              animation: "typingBounce 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
        <style>{`
          @keyframes typingBounce {
            0%,80%,100% { transform:translateY(0); opacity:0.4; }
            40%          { transform:translateY(-4px); opacity:1; }
          }
        `}</style>
      </div>
      <span>{label}</span>
    </div>
  );
}