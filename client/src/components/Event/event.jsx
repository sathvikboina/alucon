import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/* ─── Countdown chip ─────────────────────────────── */
const QnACountdown = ({ endTime }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endTime) - new Date();
      if (diff <= 0) return "Closing now…";
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff / 3600000) % 24);
      const m = Math.floor((diff / 60000) % 60);
      const s = Math.floor((diff / 1000) % 60);
      const parts = [];
      if (d) parts.push(`${d}d`);
      if (h) parts.push(`${h}h`);
      if (m) parts.push(`${m}m`);
      if (s || !parts.length) parts.push(`${s}s`);
      return `Closes in ${parts.join(" ")}`;
    };
    setTimeLeft(calc());
    const t = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(t);
  }, [endTime]);

  return (
    <span style={{
      fontSize: 12, color: "#92640a", background: "#fef3c7",
      padding: "3px 10px", borderRadius: 12, fontWeight: 500,
    }}>
      ⏱ {timeLeft}
    </span>
  );
};

/* ─── Status badge ───────────────────────────────── */
const StatusBadge = ({ status }) => {
  const map = {
    live:     { bg: "#e6f4ea", color: "#1a6632", label: "● Live"   },
    upcoming: { bg: "#fef3c7", color: "#92640a", label: "Upcoming" },
    ended:    { bg: "#f3f4f6", color: "#6b7280", label: "Ended"    },
  };
  const s = map[status] || map.ended;
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "4px 11px", borderRadius: 4,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.6px",
      textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
};

/* ─── Speaker initials avatar ────────────────────── */
const Avatar = ({ name }) => {
  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  return (
    <div style={{
      width: 38, height: 38, borderRadius: "50%",
      background: "#1a2a4a", color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 13, fontWeight: 600, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
};

/* ─── Meta chip ──────────────────────────────────── */
const MetaChip = ({ icon, text }) => (
  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6b7280" }}>
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#9ca3af" strokeWidth="1.5">
      {icon}
    </svg>
    {text}
  </span>
);

/* ─── Helpers ────────────────────────────────────── */
const borderColor = { live: "#1a6632", upcoming: "#92640a", ended: "#9ca3af" };

const getStatus = (event) => {
  const now   = new Date();
  const start = new Date(event.startTime);
  const end   = new Date(event.endTime);
  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "live";
  return "ended";
};

const fmt     = (iso) => new Date(iso).toLocaleString();
const fmtDate = (iso) => iso?.slice(0, 10) || "N/A";

/* ─── Main component ─────────────────────────────── */
const Event = () => {
  const [EventData,    setEventData]    = useState([]);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [questionText, setQuestionText] = useState("");
  const [replyTextMap, setReplyTextMap] = useState({});
  const [questionsMap, setQuestionsMap] = useState({});
  const [showModal,    setShowModal]    = useState(false);
  const [deleteData,   setDeleteData]   = useState(null);

  const userData = JSON.parse(localStorage.getItem("_user_data"));
  const userID   = userData._id;
  const userRole = userData.role;

  useEffect(() => {
    axios.get(`/api/event/get/getevent`)
      .then(({ data }) => setEventData([...data].reverse()))
      .catch(console.log);
  }, []);

  useEffect(() => {
    const now = new Date();
    EventData.forEach((ele) => {
      if (
        ele.queryStartTime && ele.queryEndTime &&
        now >= new Date(ele.queryStartTime) &&
        now <= new Date(ele.queryEndTime)
      ) fetchQuestions(ele._id);
    });
  }, [EventData]);

  const fetchQuestions = async (eventId) => {
    try {
      const { data } = await axios.get(`/api/event-questions/${eventId}/questions`);
      setQuestionsMap((prev) => ({ ...prev, [eventId]: data }));
    } catch (err) { console.log(err); }
  };

  const askQuestion = async (eventId) => {
    if (!questionText.trim()) { alert("Enter question"); return; }
    try {
      await axios.post(`/api/event-questions/${eventId}/question`, { question: questionText });
      setQuestionText("");
      fetchQuestions(eventId);
    } catch { alert("Error submitting question"); }
  };

  const replyToQuestion = async (questionId, eventId) => {
    const replyText = replyTextMap[questionId];
    if (!replyText?.trim()) { alert("Enter reply"); return; }
    try {
      await axios.post(`/api/event-questions/reply/${questionId}`, { replyText });
      setReplyTextMap((prev) => ({ ...prev, [questionId]: "" }));
      fetchQuestions(eventId);
    } catch { alert("Error replying"); }
  };

  const confirmDelete = async () => {
    if (!deleteData) return;
    try {
      if (deleteData.type === "question") {
        await axios.delete(`/api/event-questions/${deleteData.questionId}`);
      } else if (deleteData.type === "reply") {
        await axios.delete(`/api/event-questions/reply/${deleteData.questionId}/${deleteData.replyId}`);
      } else if (deleteData.type === "event") {
        const res = await axios.post(`/api/event/deleteevent`, { userID, userRole, eventID: deleteData.eventId });
        if (res.data?.invalid_msg === "invalid") alert("Authorization failed.");
        else window.location.reload(false);
        return;
      }
      fetchQuestions(deleteData.eventId);
      setShowModal(false);
      setDeleteData(null);
    } catch { alert("Delete failed"); }
  };

  /* ── shared style tokens ── */
  const inp    = { flex: 1, padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, color: "#374151", background: "#fff", fontFamily: "Georgia, serif" };
  const btnSm  = { padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 500, border: "none", background: "#1a2a4a", color: "#fff", cursor: "pointer", fontFamily: "Georgia, serif", marginLeft: 8 };
  const btnDel = { background: "#fff", color: "#b91c1c", padding: "7px 16px", borderRadius: 6, fontSize: 13, border: "1px solid #f3c6c6", cursor: "pointer", fontFamily: "Georgia, serif" };
  const btnJoin= { background: "#1a2a4a", color: "#fff", padding: "8px 20px", borderRadius: 6, fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "Georgia, serif" };

  return (
    <div style={{ background: "#f0f2f5", minHeight: "100vh", paddingBottom: 48 }}>

      {/* TOP BAR */}
      <div style={{ background: "#1a2a4a", padding: "22px 8%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36 }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: "#fff", letterSpacing: "0.3px" }}>Events</div>
        {userRole === "Admin" && (
          <Link to="/createEvent" style={{ background: "transparent", color: "#fff", padding: "8px 18px", borderRadius: 6, fontSize: 13, fontWeight: 500, border: "1px solid rgba(255,255,255,0.5)", textDecoration: "none", letterSpacing: "0.3px" }}>
            + Create Event
          </Link>
        )}
      </div>

      {/* SEARCH BAR */}
      <div style={{ width: "66%", margin: "0 auto 24px" }}>
        <input 
          type="text" 
          placeholder="Search events by title, description, or speaker..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%", boxSizing: "border-box", padding: "12px 18px", borderRadius: 8, border: "1px solid #d8dde6",
            fontSize: 14, color: "#374151", background: "#fff", outline: "none",
            boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
          }}
        />
      </div>

      {/* EVENT CARDS */}
      {EventData.filter(ele => 
        (ele.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ele.Description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ele.Speaker || "").toLowerCase().includes(searchQuery.toLowerCase())
      ).map((ele) => {
        const now         = new Date();
        const status      = getStatus(ele);
        const isQnAOpen   = ele.queryStartTime && ele.queryEndTime &&
                            now >= new Date(ele.queryStartTime) &&
                            now <= new Date(ele.queryEndTime);
        const isQnAClosed = ele.queryEndTime && now > new Date(ele.queryEndTime);

        return (
          <div key={ele._id} style={{ width: "66%", margin: "0 auto 28px", background: "#fff", borderRadius: 10, border: "1px solid #d8dde6", overflow: "hidden" }}>

            {/* CARD BODY */}
            <div style={{ borderLeft: `5px solid ${borderColor[status] || "#9ca3af"}`, padding: "24px 28px 20px" }}>

              {/* Title + badge */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ fontSize: 21, fontWeight: 600, color: "#1a2a4a", lineHeight: 1.3, paddingRight: 16 }}>
                  {ele.title}
                </div>
                <StatusBadge status={status} />
              </div>

              {/* Meta chips */}
              <div style={{ display: "flex", gap: 20, margin: "10px 0 14px", flexWrap: "wrap" }}>
                <MetaChip
                  icon={<><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M5 1v4M11 1v4M2 7h12"/></>}
                  text={fmtDate(ele.Event_post_date)}
                />
                {ele.startTime && (
                  <MetaChip
                    icon={<><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5l2.5 1.5"/></>}
                    text={`${new Date(ele.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${new Date(ele.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                  />
                )}
              </div>

              {/* Description */}
              <div style={{ fontSize: 14, lineHeight: 1.8, color: "#374151" }}>{ele.Description}</div>

              {/* Speaker */}
              {ele.Speaker && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, padding: "12px 14px", background: "#f6f7f9", borderRadius: 6 }}>
                  <Avatar name={ele.Speaker} />
                  <div>
                    <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.7px" }}>Session by</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#1a2a4a", marginTop: 1 }}>{ele.Speaker}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Q&A OPEN */}
            {isQnAOpen && (
              <div style={{ padding: "20px 28px", borderTop: "1px solid #e5e7eb", background: "#fafbfc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1a2a4a", textTransform: "uppercase", letterSpacing: "0.7px" }}>Q&amp;A</span>
                  <QnACountdown endTime={ele.queryEndTime} />
                </div>

                {/* Ask */}
                <div style={{ display: "flex", marginBottom: 14 }}>
                  <input style={inp} type="text" placeholder="Ask your question…"
                    value={questionText} onChange={(e) => setQuestionText(e.target.value)} />
                  <button style={btnSm} onClick={() => askQuestion(ele._id)}>Submit</button>
                </div>

                {/* Questions */}
                {questionsMap[ele._id]?.map((q) => (
                  <div key={q._id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: 14, marginBottom: 10 }}>
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, color: "#1a2a4a", fontSize: 13 }}>{q.studentId?.name}</span>
                      <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>{fmt(q.createdAt)}</span>
                      {(userRole === "Admin" || q.studentId?._id === userID) && (
                        <button style={{ ...btnDel, marginLeft: 10, padding: "2px 8px", fontSize: 11 }}
                          onClick={() => { setDeleteData({ type: "question", questionId: q._id, eventId: ele._id }); setShowModal(true); }}>
                          Delete
                        </button>
                      )}
                    </div>

                    <div style={{ fontSize: 13, color: "#374151", marginBottom: 10, lineHeight: 1.6 }}>{q.question}</div>

                    {/* Replies */}
                    {(q.replies || []).map((r) => (
                      <div key={r._id} style={{ background: "#f8f9fa", borderLeft: "3px solid #c5cdd8", borderRadius: "0 6px 6px 0", padding: "10px 12px", marginBottom: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>
                          {r.alumniId?.name}
                          {(userRole === "Admin" || r.alumniId?._id === userID) && (
                            <button style={{ ...btnDel, marginLeft: 10, padding: "2px 8px", fontSize: 11 }}
                              onClick={() => { setDeleteData({ type: "reply", questionId: q._id, replyId: r._id, eventId: ele._id }); setShowModal(true); }}>
                              Delete
                            </button>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>{fmt(r.createdAt)}</div>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3, lineHeight: 1.5 }}>{r.replyText}</div>
                      </div>
                    ))}

                    {/* Reply input */}
                    {userRole !== "Student" && (
                      <div style={{ display: "flex", marginTop: 10 }}>
                        <input style={inp} type="text" placeholder="Write a reply…"
                          value={replyTextMap[q._id] || ""}
                          onChange={(e) => setReplyTextMap((prev) => ({ ...prev, [q._id]: e.target.value }))} />
                        <button style={btnSm} onClick={() => replyToQuestion(q._id, ele._id)}>Reply</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Q&A CLOSED */}
            {isQnAClosed && (
              <div style={{ padding: "14px 28px", background: "#fdf2f2", borderTop: "1px solid #f3c6c6", fontSize: 13, color: "#7a2020", textAlign: "center" }}>
                Q&amp;A session has closed for this event.
              </div>
            )}

            {/* FOOTER */}
            <div style={{ padding: "14px 28px", background: "#f9fafb", borderTop: "1px solid #e5e7eb", display: "flex", gap: 10, alignItems: "center" }}>
              {(status === "live" || status === "upcoming") && (
                <a href={ele.Link} target="_blank" rel="noreferrer">
                  <button style={btnJoin}>Join Here</button>
                </a>
              )}
              {userRole === "Admin" && (
                <button style={btnDel}
                  onClick={() => { setDeleteData({ type: "event", eventId: ele._id }); setShowModal(true); }}>
                  Delete Event
                </button>
              )}
            </div>

          </div>
        );
      })}

      {/* CONFIRM MODAL */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", padding: "28px 32px", borderRadius: 10, width: 320, textAlign: "center", border: "1px solid #d8dde6" }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#1a2a4a", marginBottom: 10 }}>Confirm Deletion</div>
            <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>This action cannot be undone. Are you sure?</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <button style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", color: "#374151", cursor: "pointer", fontSize: 13, fontFamily: "Georgia, serif" }}
                onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button style={{ padding: "8px 20px", borderRadius: 6, background: "#b91c1c", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "Georgia, serif" }}
                onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Event;