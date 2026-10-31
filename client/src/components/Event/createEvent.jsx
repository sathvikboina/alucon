import { Spinner } from "react-bootstrap";
import axios from "axios";
import { useState } from "react";

const NAVY   = "#1a2a4a";
const BORDER = "#d0d5dd";
const TEXT   = "#2c3347";
const MUTED  = "#7a8399";
const BG     = "#f5f6f8";

const CreateEvent = () => {
  const [event_name,        set_event_name]        = useState("");
  const [event_description, set_event_description] = useState("");
  const [event_link,        set_event_link]         = useState("");
  const [startTime,         setStartTime]           = useState("");
  const [endTime,           setEndTime]             = useState("");
  const [qnaDuration,       setQnaDuration]         = useState("");
  const [speaker,           setSpeaker]             = useState("");
  const [loading,           setLoading]             = useState(false);

  let userData = JSON.parse(localStorage.getItem("_user_data"));
  const userID   = userData._id;
  const userName = userData.name;
  const userRole = userData.role;

  const getCurrentDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const createEvent = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!event_name || !event_description || !event_link) {
      alert("Please fill all required fields."); setLoading(false); return;
    }
    if (!startTime || !endTime) {
      alert("Please select start and end time."); setLoading(false); return;
    }
    if (new Date(endTime) <= new Date(startTime)) {
      alert("End time must be after start time."); setLoading(false); return;
    }
    if (!qnaDuration || qnaDuration <= 0) {
      alert("Enter a valid Q&A duration."); setLoading(false); return;
    }

    try {
      await axios.post(`/api/event/create-event`, {
        username: userName, userID: userID,
        event_name, speaker, description: event_description,
        link: event_link, startTime, endTime, qnaDuration,
      });
      window.location.reload(false);
    } catch (error) {
      console.error(error);
      alert("Error creating event.");
      setLoading(false);
    }
  };

  /* ── styles ── */
  const s = {
    page:   { background: BG, minHeight: "100vh", padding: "40px 0" },
    wrap:   { width: "62%", margin: "0 auto", background: "#fff",
              border: `1px solid ${BORDER}`, borderRadius: 8, padding: "36px 40px" },
    title:  { fontSize: 20, fontWeight: 600, color: NAVY,
              paddingBottom: 18, borderBottom: `1px solid #e8eaed`, marginBottom: 26 },
    group:  { marginBottom: 20 },
    label:  { display: "block", fontSize: 11, fontWeight: 600, color: MUTED,
              textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 7 },
    inp:    { width: "100%", padding: "9px 12px", border: `1px solid ${BORDER}`,
              borderRadius: 6, fontSize: 14, color: TEXT, background: "#fff",
              fontFamily: "Georgia, serif" },
    hint:   { fontSize: 11, color: "#9aa3b2", marginTop: 5 },
    row2:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
    btnSubmit: { background: NAVY, color: "#fff", padding: "10px 28px", borderRadius: 6,
                 fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer",
                 marginTop: 8, fontFamily: "Georgia, serif" },
    btnDisabled: { opacity: 0.55, cursor: "not-allowed" },
  };

  if (userRole !== "Admin") return null;

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={s.title}>Create New Event</div>

        <form onSubmit={createEvent}>
          <div style={s.group}>
            <label style={s.label}>Event Title *</label>
            <input style={s.inp} type="text" placeholder="e.g. Annual Alumni Summit 2025"
              onChange={(e) => set_event_name(e.target.value)} />
          </div>

          <div style={s.group}>
            <label style={s.label}>Speaker Name</label>
            <input style={s.inp} type="text" placeholder="e.g. Prof. Rajendra Sharma"
              onChange={(e) => setSpeaker(e.target.value)} />
          </div>

          <div style={s.group}>
            <label style={s.label}>Description *</label>
            <textarea style={{ ...s.inp, resize: "vertical", minHeight: 90, lineHeight: 1.6 }}
              placeholder="Provide a brief overview of the event, agenda, and intended audience…"
              onChange={(e) => set_event_description(e.target.value)} />
          </div>

          <div style={s.group}>
            <label style={s.label}>Event Link *</label>
            <input style={s.inp} type="text" placeholder="https://meet.google.com/..."
              onChange={(e) => set_event_link(e.target.value)} />
            <div style={s.hint}>Paste the meeting or webinar URL here.</div>
          </div>

          <div style={s.row2}>
            <div style={s.group}>
              <label style={s.label}>Start Time *</label>
              <input style={s.inp} type="datetime-local" min={getCurrentDateTime()}
                onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div style={s.group}>
              <label style={s.label}>End Time *</label>
              <input style={s.inp} type="datetime-local" min={startTime || getCurrentDateTime()}
                onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div style={s.group}>
            <label style={s.label}>Post-Event Q&amp;A Window (hours) *</label>
            <input style={{ ...s.inp, maxWidth: 200 }} type="number" placeholder="e.g. 24" min="1"
              onChange={(e) => setQnaDuration(e.target.value)} />
            <div style={s.hint}>Questions will be open for this many hours after the event ends.</div>
          </div>

          <button type="submit" style={{ ...s.btnSubmit, ...(loading ? s.btnDisabled : {}) }} disabled={loading}>
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Spinner animation="border" size="sm" /> Creating…
              </span>
            ) : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;