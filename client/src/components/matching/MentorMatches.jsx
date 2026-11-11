import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../utils/api";
import "./matching.css";

const AREAS = [
  "Career",
  "Research",
  "Higher Studies",
  "Entrepreneurship",
  "Placements",
  "Other",
];

const scoreTone = (score) =>
  score >= 82 ? "strong" : score >= 68 ? "good" : score >= 52 ? "stretch" : "low";

const initials = (name = "") =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const Score = ({ score, verdict }) => (
  <div className={`match-score ${scoreTone(score)}`}>
    <span className="match-score-value">{score}%</span>
    <span className="match-score-verdict">{verdict}</span>
  </div>
);

const RequestModal = ({ mentor, onClose, onSent }) => {
  const [area, setArea] = useState(mentor.goal || "Career");
  const [message, setMessage] = useState(mentor.suggestedMessage || "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      await api.post("/api/mentorship", {
        requestedTo: mentor.id,
        areaOfHelp: area,
        message,
      });
      onSent(mentor.id);
    } catch (err) {
      setError(
        err?.response?.data?.msg || "Could not send the mentorship request."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="match-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="match-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Request mentorship from ${mentor.name}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="match-modal-head">
          <div>
            <p className="match-eyebrow">Mentorship request</p>
            <h2>{mentor.name}</h2>
            <p className="match-posted-by">
              {mentor.designation}
              {mentor.organisation ? ` · ${mentor.organisation}` : ""}
            </p>
          </div>
          <button type="button" className="match-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={submit}>
          <label className="match-field">
            Area of help
            <select value={area} onChange={(e) => setArea(e.target.value)}>
              {AREAS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="match-field">
            Message
            <textarea
              rows="5"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share what you want help with and what you have already tried."
              maxLength="1200"
            />
            <small>{message.length}/1200 characters</small>
          </label>

          {error && <div className="match-error">{error}</div>}

          <div className="match-modal-actions">
            <button type="button" className="match-secondary-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="match-primary-btn" disabled={sending}>
              {sending ? "Sending…" : "Send request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MentorMatches = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Empty means "use the goals saved on the profile"; the server infers them.
  const [goal, setGoal] = useState("");
  const [activeMentor, setActiveMentor] = useState(null);
  const [requested, setRequested] = useState([]);
  const [notice, setNotice] = useState("");

  const loadMatches = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/ai/insights/mentors/matches", {
        params: { area: goal, limit: 8 },
      });
      setData(res.data);
    } catch (err) {
      setError(
        err?.response?.data?.msg || "Could not load mentor matches right now."
      );
    } finally {
      setLoading(false);
    }
  }, [goal]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const requestedSet = useMemo(() => new Set(requested), [requested]);
  // Stored goal wins until the member explicitly picks a different one.
  const activeGoal = goal || data?.goal || "";

  const handleSent = (mentorId) => {
    setRequested((prev) => [...new Set([...prev, mentorId])]);
    setActiveMentor(null);
    setNotice("Request sent. The mentor can accept or decline it from their dashboard.");
  };

  return (
    <div className="match-page">
      <div className="match-hero mentor-hero">
        <div className="match-hero-copy">
          <p className="match-eyebrow">Mentorship matching</p>
          <h1>Find a mentor who has been there</h1>
          <p>
            Matches use your goal, shared skills and the mentor's availability.
            AI can re-rank the shortlist, but the mentor always decides whether
            to accept.
          </p>
        </div>
        <Link to="/mentorship" className="match-ghost-btn">
          Open mentorship dashboard
        </Link>
      </div>

      <div className="match-goal-bar">
        <span className="match-goal-label">What do you want help with?</span>
        <div className="match-goal-options">
          {AREAS.map((item) => (
            <button
              key={item}
              type="button"
              className={`match-goal-pill ${activeGoal === item ? "active" : ""}`}
              onClick={() => setGoal(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {data?.profile && (
        <div className="match-context">
          <div className="match-context-profile">
            <div>
              <span className="match-context-label">Ranking for</span>
              <strong>{data.profile.name}</strong>
              <span className="match-context-sub">
                {data.profile.program || "IIITA member"}
              </span>
            </div>
            <div className="match-chip-row">
              {data.profile.skills?.map((skill) => (
                <span key={skill} className="match-chip">
                  {skill}
                </span>
              ))}
            </div>
          </div>
          <div className="match-pipeline">
            <span>1 · Availability</span>
            <span>2 · Goal fit</span>
            <span>3 · Shared context</span>
            <span>4 · Explanation</span>
          </div>
        </div>
      )}

      <div className="match-toolbar">
        <div className="match-summary-line">
          <span>
            {data?.matches?.length || 0} mentor
            {data?.matches?.length === 1 ? "" : "s"} for{" "}
            {(activeGoal || "mentorship").toLowerCase()}
          </span>
          {data?.summary && <span>{data.summary}</span>}
        </div>
        {data && (
          <div className="match-model-note">
            <span className={`match-model-dot ${data.model === "algorithm" ? "" : "offline"}`} />
            {data.model === "algorithm" ? "Algorithmic ranking" : "Rule-based ranking"}
            {data.cached ? " · cached" : ""}
          </div>
        )}
      </div>

      {notice && <div className="match-notice">{notice}</div>}
      {error && <div className="match-error">{error}</div>}

      {loading ? (
        <div className="match-grid">
          {[1, 2, 3].map((item) => (
            <div className="match-card match-skeleton" key={item}>
              <div className="skeleton-line short" />
              <div className="skeleton-line" />
              <div className="skeleton-line medium" />
            </div>
          ))}
        </div>
      ) : data?.matches?.length ? (
        <div className="match-grid mentor-grid">
          {data.matches.map((mentor) => {
            const isRequested = requestedSet.has(mentor.id);
            return (
              <article className="match-card mentor-card" key={mentor.id}>
                <div className="mentor-card-head">
                  {mentor.avatar ? (
                    <img className="mentor-avatar" src={mentor.avatar} alt={mentor.name} />
                  ) : (
                    <div className="mentor-avatar fallback">{initials(mentor.name)}</div>
                  )}
                  <div className="mentor-identity">
                    <h2>{mentor.name}</h2>
                    <p>
                      {mentor.designation || mentor.role}
                      {mentor.organisation ? ` · ${mentor.organisation}` : ""}
                    </p>
                    <div className="match-chip-row">
                      {mentor.areas?.map((area) => (
                        <span key={area} className="match-chip area">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Score score={mentor.score} verdict={mentor.verdict} />
                </div>

                <p className="match-card-summary">{mentor.summary}</p>

                {mentor.reasons?.length > 0 && (
                  <ul className="match-reasons">
                    {mentor.reasons.slice(0, 4).map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                )}

                {mentor.matchingSkills?.length > 0 && (
                  <div className="match-chip-row">
                    {mentor.matchingSkills.map((skill) => (
                      <span key={skill} className="match-chip matched">
                        ✓ {skill}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mentor-availability">
                  <span>
                    {mentor.slots > 0
                      ? `${mentor.slots} of ${mentor.capacity} mentoring slots open`
                      : "Currently at capacity"}
                  </span>
                  {mentor.location && <span>{mentor.location}</span>}
                </div>

                <div className="match-card-footer">
                  <div className="match-card-actions">
                    <Link to={`/profile/${mentor.id}`} className="match-secondary-btn">
                      View profile
                    </Link>
                    <button
                      type="button"
                      className="match-primary-btn"
                      disabled={isRequested}
                      onClick={() => {
                        setNotice("");
                        setActiveMentor({ ...mentor, goal: activeGoal || mentor.goal || "Career" });
                      }}
                    >
                      {isRequested ? "Request sent ✓" : "Request mentorship"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="match-empty">
          <h3>No mentors available for this goal yet</h3>
          <p>
            Try another goal, or check back after more alumni publish their
            mentoring availability.
          </p>
          <button type="button" className="match-primary-btn" onClick={loadMatches}>
            Refresh matches
          </button>
        </div>
      )}

      {activeMentor && (
        <RequestModal
          mentor={activeMentor}
          onClose={() => setActiveMentor(null)}
          onSent={handleSent}
        />
      )}
    </div>
  );
};

export default MentorMatches;
