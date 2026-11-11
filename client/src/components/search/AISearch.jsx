import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import api from "../../utils/api";
import "./AISearch.css";

const SUGGESTIONS = [
  "Find ML internships in Bangalore",
  "Find alumni working at Google",
  "Find posts about placements",
  "Find resources for learning Python",
  "Find resources",
  "Find upcoming technical events",
];

const TYPE_ICONS = {
  job: "fa-briefcase",
  alumni: "fa-user-graduate",
  post: "fa-comments",
  resource: "fa-book-open",
  event: "fa-calendar-alt",
  group: "fa-users",
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const metaChips = (item) => {
  const meta = item.meta || {};
  if (item.type === "job") {
    return [meta.jobType, meta.location, meta.workMode].filter(Boolean);
  }
  if (item.type === "alumni") {
    return [meta.designation, meta.organisation, meta.location].filter(Boolean);
  }
  if (item.type === "post") {
    return [meta.channel, formatDate(meta.date)].filter(Boolean);
  }
  if (item.type === "event") {
    return [formatDate(meta.startTime)].filter(Boolean);
  }
  if (item.type === "resource") {
    return [meta.topic].filter(Boolean);
  }
  if (item.type === "group") {
    return [meta.access].filter(Boolean);
  }
  return [];
};

const ResultCard = ({ item }) => (
  <Link to={item.url} className="ai-search-result">
    <span className="ai-search-result-icon" aria-hidden="true">
      <i className={`fas ${TYPE_ICONS[item.type] || "fa-link"}`} />
    </span>
    <span className="ai-search-result-body">
      <span className="ai-search-result-top">
        <strong>{item.title}</strong>
        <span className="ai-search-score">{item.score}%</span>
      </span>
      {item.subtitle && <span className="ai-search-subtitle">{item.subtitle}</span>}
      {item.snippet && <span className="ai-search-snippet">{item.snippet}</span>}
      {metaChips(item).length > 0 && (
        <span className="ai-search-chips">
          {metaChips(item).map((chip) => (
            <span key={chip} className="ai-search-chip">
              {chip}
            </span>
          ))}
        </span>
      )}
    </span>
  </Link>
);

const AISearch = () => {
  const location = useLocation();
  const history = useHistory();
  const [term, setTerm] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef(0);

  const runSearch = useCallback(async (value) => {
    const q = String(value || "").trim();
    if (!q) {
      setData(null);
      setError("");
      setLoading(false);
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setError("");

    try {
      const { data: payload } = await api.get("/api/search", {
        params: { q },
      });
      if (requestRef.current === requestId) setData(payload);
    } catch (err) {
      if (requestRef.current === requestId) {
        setData(null);
        setError(
          err?.response?.data?.msg || "Search is temporarily unavailable."
        );
      }
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  }, []);

  // The query lives in the URL so a search can be linked and refreshed.
  useEffect(() => {
    const q = new URLSearchParams(location.search).get("q") || "";
    setTerm(q);
    setSubmitted(q.trim());
    runSearch(q);
  }, [location.search, runSearch]);

  const submit = (event) => {
    event.preventDefault();
    const q = term.trim();
    if (!q) return;
    if (q === submitted) {
      runSearch(q);
      return;
    }
    history.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const pickSuggestion = (suggestion) => {
    setTerm(suggestion);
    history.push(`/search?q=${encodeURIComponent(suggestion)}`);
  };

  return (
    <div className="ai-search-page">
      <section className="ai-search-hero">
        <p className="ai-search-kicker">
          <span aria-hidden="true">✦</span> AI Search
        </p>
        <h1>Ask the whole community</h1>
        <p className="ai-search-lede">
          One search across internships and jobs, alumni, posts, resources,
          events and groups. Results are ranked locally with BGE embeddings and
          keyword evidence — no chatbot, no generated answers.
        </p>

        <form className="ai-search-form" onSubmit={submit} role="search">
          <i className="fas fa-search" aria-hidden="true" />
          <input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Try “Find ML internships in Bangalore”"
            aria-label="Search the community"
            maxLength={240}
          />
          <button type="submit" disabled={loading || !term.trim()}>
            {loading ? "Searching…" : "Search"}
          </button>
        </form>

        <div className="ai-search-suggestions">
          <span>Try</span>
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => pickSuggestion(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </section>

      <section className="ai-search-body" aria-live="polite">
        {error && <p className="ai-search-error">{error}</p>}

        {!submitted && !error && (
          <div className="ai-search-empty">
            <h2>What do you want to find?</h2>
            <p>
              Search by subject, not by page. “Placements”, “computer vision” or
              “founder” all work. A query with no matching records returns no
              results instead of loosely related pages.
            </p>
          </div>
        )}

        {submitted && loading && !data && (
          <p className="ai-search-loading">Reading the index…</p>
        )}

        {submitted && !loading && data && data.total === 0 && (
          <div className="ai-search-empty">
            <h2>No matches for “{data.query}”</h2>
            <p>
              Nothing in the community mentions that subject yet. Try a broader
              phrase, or one of the suggestions above.
            </p>
          </div>
        )}

        {submitted && data && data.total > 0 && (
          <>
            <div className="ai-search-meta">
              <span>
                <strong>{data.total}</strong> result
                {data.total === 1 ? "" : "s"} for “{data.query}”
              </span>
              <span className="ai-search-engine">
                {data.engine?.model || "local"} · {data.engine?.dimensions || 384}
                -dim · {data.engine?.indexSize || 0} indexed records
              </span>
            </div>

            {data.notice && <p className="ai-search-notice">{data.notice}</p>}

            {data.groups.map((group) => (
              <section key={group.type} className="ai-search-group">
                <header>
                  <h2>
                    <i
                      className={`fas ${TYPE_ICONS[group.type] || "fa-link"}`}
                      aria-hidden="true"
                    />
                    {group.label}
                  </h2>
                  <span>{group.count}</span>
                </header>
                <div className="ai-search-results">
                  {group.items.map((item) => (
                    <ResultCard key={`${item.type}:${item.id}`} item={item} />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </section>
    </div>
  );
};

export default AISearch;
