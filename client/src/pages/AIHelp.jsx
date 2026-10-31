import React, { useState, useRef, useEffect } from "react";
import api from "../utils/api";

const suggestions = [
  "What events are coming up?",
  "Tell me about research projects",
  "Who are notable alumni?",
  "What infrastructure is available?",
];

const AIHelp = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, loading]);

  const handleSend = async (text) => {
    const question = (text || input).trim();
    if (!question) return;

    if (question.length > 500) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Please keep the question under 500 characters." },
      ]);
      return;
    }

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post("/api/ai/ask-ai", { prompt: question });
      setMessages((prev) => [...prev, { role: "bot", text: res.data.reply}]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: err?.response?.data?.error || "Unable to reach the server. Please try again." },
      ]);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: "1.5rem 0", maxWidth: "720px", margin: "0 auto", fontFamily: "sans-serif" }}>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "1rem 1.25rem", background: "#0c1f57",
        borderRadius: "12px 12px 0 0",
      }}>
        <div style={{
          width: 36, height: 36, background: "rgba(255,255,255,0.2)",
          borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
        </div>
        <div>
          <div style={{ color: "white", fontSize: "16px", fontWeight: 500 }}>Institute Assistant</div>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "12px", marginTop: "2px" }}>
            Ask about events, alumni, research & more
          </div>
        </div>
        <div style={{
          width: 8, height: 8, background: "#4ade80",
          borderRadius: "50%", marginLeft: "auto",
        }} />
      </div>

      {/* Messages */}
      <div 
        ref={containerRef}
        style={{
        minHeight: "340px", maxHeight: "420px", overflowY: "auto",
        padding: "1.25rem", background: "#f8fafc",
        border: "1px solid #e2e8f0", borderTop: "none",
        display: "flex", flexDirection: "column", gap: "12px",
      }}>
        {messages.length === 0 && !loading && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", height: "280px", gap: "10px", opacity: 0.45,
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <p style={{ fontSize: "13px", color: "#64748b" }}>Ask anything about the institute</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex", gap: "8px", alignItems: "flex-end",
            flexDirection: msg.role === "user" ? "row-reverse" : "row",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "11px", fontWeight: 500,
              background: msg.role === "user" ? "#dbeafe" : "#1e40af",
              color: msg.role === "user" ? "#1e40af" : "white",
            }}>
              {msg.role === "user" ? "You" : "AI"}
            </div>
            <div style={{
              maxWidth: "75%", padding: "10px 14px",
              borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              fontSize: "14px", lineHeight: 1.55,
              background: msg.role === "user" ? "#1e40af" : "white",
              color: msg.role === "user" ? "white" : "#1e293b",
              border: msg.role === "bot" ? "1px solid #e2e8f0" : "none",
            }}>
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", background: "#1e40af",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "11px", color: "white", fontWeight: 500,
            }}>AI</div>
            <div style={{
              padding: "12px 16px", background: "white", border: "1px solid #e2e8f0",
              borderRadius: "16px 16px 16px 4px", display: "flex", gap: "4px", alignItems: "center",
            }}>
              {[0, 0.2, 0.4].map((delay, i) => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: "50%", background: "#94a3b8",
                  animation: "bounce 1.2s infinite", animationDelay: `${delay}s`,
                }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "8px",
        padding: "0.75rem 1.25rem", background: "#f8fafc",
        border: "1px solid #e2e8f0", borderTop: "none",
      }}>
        <p style={{ width: "100%", fontSize: "11px", color: "#94a3b8", marginBottom: "2px" }}>Suggestions</p>
        {suggestions.map((s, i) => (
          <span key={i} onClick={() => handleSend(s)} style={{
            padding: "5px 12px", borderRadius: "999px",
            border: "1px solid #bfdbfe", background: "#eff6ff",
            color: "#1e40af", fontSize: "12px", cursor: "pointer",
          }}>
            {s}
          </span>
        ))}
      </div>

      {/* Input */}
      <div style={{
        display: "flex", gap: "10px", padding: "1rem 1.25rem",
        background: "white", border: "1px solid #e2e8f0",
        borderTop: "none", borderRadius: "0 0 12px 12px",
      }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask something about the institute..."
          style={{
            flex: 1, padding: "10px 14px",
            border: "1px solid #cbd5e1", borderRadius: "8px",
            fontSize: "14px", outline: "none", fontFamily: "sans-serif",
          }}
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          style={{
            width: 40, height: 40, borderRadius: "50%",
            background: loading || !input.trim() ? "#93c5fd" : "#1e40af",
            border: "none", cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>

      <style>{`@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }`}</style>
    </div>
  );
};

export default AIHelp;