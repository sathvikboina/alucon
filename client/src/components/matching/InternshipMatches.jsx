import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../utils/api";
import "./matching.css";

const FILTER_TYPES = ["All", "Internship", "Project", "Research", "Referral"];
const FILTER_MODES = ["All", "Remote", "Hybrid", "Onsite"];

const scoreTone = (score) =>
  score >= 82 ? "strong" : score >= 68 ? "good" : score >= 52 ? "stretch" : "low";

const formatDate = (value) => {
  if (!value) return "No deadline";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No deadline";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const deadlineLabel = (days) => {
  if (days === null || days === undefined) return "No deadline";
  if (days < 0) return "Closed";
  if (days === 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  return `${days} days left`;
};

const Score = ({ score, verdict }) => (
  <div className={`match-score ${scoreTone(score)}`}>
    <span className="match-score-value">{score}%</span>
    <span className="match-score-verdict">{verdict}</span>
  </div>
);

const InternshipMatches = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [type, setType] = useState("All");
  const [mode, setMode] = useState("All");

  const loadMatches = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/ai/insights/jobs/matches", {
        params: {
          limit: 8,
          type: type === "All" ? "" : type,
          mode: mode === "All" ? "" : mode,
        },
      });
      setData(res.data);
    } catch (err) {
      setError(
        err?.response?.data?.msg ||
          "Could not load your internship matches right now."
      );
    } finally {
      setLoading(false);
    }
  }, [type, mode]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  return (
    <div className="match-page">
      <div className="match-hero">
        <div className="match-hero-copy">
          <p className="match-eyebrow">Opportunity matching</p>
          <h1>Internships picked for you</h1>
          <p>
            Ranked from your skills, goals and work preferences. Every score
            shows the evidence behind it, so you can decide where to spend your
            application time.
          </p>
        </div>
        <Link to="/jobs" className="match-ghost-btn">
          Browse all opportunities
        </Link>
      </div>

      {data?.profile && (
        <div className="match-context">
          <div className="match-context-profile">
            <div>
              <span className="match-context-label">Ranking for</span>
              <strong>{data.profile.name}</strong>
              <span className="match-context-sub">
                {data.profile.program || "IIITA member"}
                {data.profile.workingArea ? ` · ${data.profile.workingArea}` : ""}
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
          <div className="match-pipeline" aria-label="Matching pipeline">
            <span>1 · Eligibility</span>
            <span>2 · Skill overlap</span>
            <span>3 · Context</span>
            <span>4 · Explanation</span>
          </div>
        </div>
      )}

      <div className="match-toolbar">
        <div className="match-filters">
          <label>
            Type
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {FILTER_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            Work mode
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              {FILTER_MODES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
        {data && (
          <div className="match-model-note">
            <span className={`match-model-dot ${data.model === "offline" ? "offline" : "ai"}`} />
            {data.model === "offline" ? "Rule-based ranking" : "AI re-ranked"}
            {data.cached ? " · cached" : ""}
          </div>
        )}
      </div>

      {error && <div className="match-error">{error}</div>}

      {loading ? (
        <div className="match-grid">
          {[1, 2, 3].map((item) => (
            <div className="match-card match-skeleton" key={item}>
              <div className="skeleton-line short" />
              <div className="skeleton-line" />
              <div className="skeleton-line" />
              <div className="skeleton-line medium" />
            </div>
          ))}
        </div>
      ) : data?.matches?.length ? (
        <>
          <div className="match-summary-line">
            <span>
              {data.matches.length} of {data.total} open opportunities
            </span>
            <span>{data.summary}</span>
          </div>
          <div className="match-grid">
            {data.matches.map((match) => (
              <article className="match-card" key={match.id}>
                <div className="match-card-head">
                  <Score score={match.score} verdict={match.verdict} />
                  <div className="match-card-title">
                    <div className="match-badge-row">
                      <span className="match-badge">{match.type}</span>
                      {match.workMode && (
                        <span className="match-badge subtle">{match.workMode}</span>
                      )}
                      {match.location && (
                        <span className="match-badge subtle">{match.location}</span>
                      )}
                    </div>
                    <h2>{match.title}</h2>
                    <p className="match-posted-by">
                      Posted by {match.poster.name}
                      {match.poster.role ? ` · ${match.poster.role}` : ""}
                    </p>
                  </div>
                </div>

                <p className="match-card-summary">{match.summary}</p>

                {match.reasons?.length > 0 && (
                  <ul className="match-reasons">
                    {match.reasons.slice(0, 3).map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                )}

                {(match.matchedSkills?.length > 0 ||
                  match.missingSkills?.length > 0) && (
                  <div className="match-chip-row">
                    {match.matchedSkills?.map((skill) => (
                      <span key={skill} className="match-chip matched">
                        ✓ {skill}
                      </span>
                    ))}
                    {match.missingSkills?.map((skill) => (
                      <span key={skill} className="match-chip missing">
                        + {skill}
                      </span>
                    ))}
                  </div>
                )}

                <div className="match-card-footer">
                  <div className="match-deadline">
                    <span>{deadlineLabel(match.deadlineDays)}</span>
                    <small>{formatDate(match.deadline)}</small>
                  </div>
                  <div className="match-card-actions">
                    <Link to="/jobs" className="match-secondary-btn">
                      Compare roles
                    </Link>
                    {match.applyLink ? (
                      <a
                        className="match-primary-btn"
                        href={match.applyLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Apply →
                      </a>
                    ) : (
                      <Link className="match-primary-btn" to="/jobs">
                        View details
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="match-empty">
          <h3>No open matches for these filters</h3>
          <p>
            Try switching the type or work mode, or add a few more skills to
            your profile so the ranking has more evidence to work with.
          </p>
          <button type="button" className="match-primary-btn" onClick={loadMatches}>
            Refresh matches
          </button>
        </div>
      )}
    </div>
  );
};

export default InternshipMatches;
