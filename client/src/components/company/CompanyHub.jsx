import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../utils/api";
import "./CompanyHub.css";

const dateLabel = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const CompanyHub = () => {
  const { slug } = useParams();
  const [hub, setHub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(`/api/companies/${slug}`);
        if (!cancelled) setHub(data);
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.msg || "Could not load this company.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return <div className="company-page company-muted">Loading company…</div>;
  }

  if (error || !hub) {
    return (
      <div className="company-page">
        <div className="company-alert">{error || "Company not found."}</div>
        <Link className="company-back" to="/jobs">
          Back to jobs
        </Link>
      </div>
    );
  }

  const renderPerson = (person, keyPrefix) => (
    <Link
      className="company-person"
      key={`${keyPrefix}-${person.id}`}
      to={`/profile/${person.id}`}
    >
      {person.avatar ? (
        <img src={person.avatar} alt="" />
      ) : (
        <span className="company-avatar">
          {String(person.name || "?").slice(0, 1).toUpperCase()}
        </span>
      )}
      <span>
        <strong>{person.name}</strong>
        <small>
          {person.role ? `${person.role} · ` : ""}
          {person.designation || "Alumnus"}
          {person.passing_year ? ` · ${person.passing_year}` : ""}
        </small>
      </span>
    </Link>
  );

  return (
    <div className="company-page">
      <div className="company-header">
        <div>
          <p className="company-kicker">Company hub</p>
          <h2>{hub.company.name}</h2>
          <p className="company-muted">
            Jobs, signals, alumni and active doors resolved from existing
            profiles and postings at read time. Nothing was rewritten to build
            this page.
          </p>
        </div>
        <Link className="company-back" to="/jobs">
          Back to jobs
        </Link>
      </div>

      <div className="company-counts">
        <span>{hub.counts.jobs} open jobs</span>
        <span>{hub.counts.signals} live signals</span>
        <span>{hub.counts.currentAlumni} current alumni</span>
        <span>{hub.counts.pastAlumni} past alumni</span>
        <span>{hub.counts.doors} active doors</span>
      </div>

      <section className="company-panel">
        <h3>Signals</h3>
        <p className="company-muted">
          Dated hiring notes, not job posts. Expired signals are hidden.
        </p>
        {hub.signals.length === 0 ? (
          <p className="company-muted">No live signals right now.</p>
        ) : (
          <div className="company-grid">
            {hub.signals.map((signal) => (
              <article className="company-card" key={signal.id}>
                <div className="company-card-head">
                  <span className="company-chip signal">Signal</span>
                  <span className="company-muted">
                    {signal.expectedWindow || "Window not stated"}
                  </span>
                </div>
                <h4>{signal.title}</h4>
                <p>{signal.description}</p>
                <small className="company-muted">
                  {signal.poster.name}
                  {signal.expiresAt
                    ? ` · visible until ${dateLabel(signal.expiresAt)}`
                    : ""}
                </small>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="company-panel">
        <h3>Open jobs</h3>
        {hub.jobs.length === 0 ? (
          <p className="company-muted">No open jobs at this company.</p>
        ) : (
          <div className="company-grid">
            {hub.jobs.map((job) => (
              <article className="company-card" key={job.id}>
                <div className="company-card-head">
                  <span className="company-chip">{job.type || "Role"}</span>
                  {job.score !== null && (
                    <span className="company-score">
                      {job.score}% match · algorithm
                    </span>
                  )}
                </div>
                <h4>{job.title}</h4>
                <p>{job.description}</p>
                <small className="company-muted">
                  {[job.location, job.workMode, dateLabel(job.deadline)]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
                {job.matchedSkills.length > 0 && (
                  <p className="company-skills">
                    <strong>Matched:</strong> {job.matchedSkills.join(", ")}
                  </p>
                )}
                {job.missingSkills.length > 0 && (
                  <p className="company-skills missing">
                    <strong>Missing:</strong> {job.missingSkills.join(", ")}
                  </p>
                )}
                {job.applyLink && (
                  <a
                    className="company-apply"
                    href={job.applyLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Apply
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="company-panel">
        <h3>Alumni here now</h3>
        {hub.alumni.current.length === 0 ? (
          <p className="company-muted">No current alumni records yet.</p>
        ) : (
          <div className="company-people">
            {hub.alumni.current.map((person) =>
              renderPerson(person, "current")
            )}
          </div>
        )}
      </section>

      <section className="company-panel">
        <h3>Past alumni</h3>
        {hub.alumni.past.length === 0 ? (
          <p className="company-muted">No past alumni records yet.</p>
        ) : (
          <div className="company-people">
            {hub.alumni.past.map((person) =>
              renderPerson({ ...person, role: person.role }, "past")
            )}
          </div>
        )}
      </section>

      <section className="company-panel">
        <h3>Open doors</h3>
        {hub.doors.length === 0 ? (
          <p className="company-muted">
            No active doors from alumni at this company.
          </p>
        ) : (
          <div className="company-grid">
            {hub.doors.map((door) => (
              <article className="company-card" key={door.id}>
                <div className="company-card-head">
                  <span className="company-chip door">{door.type}</span>
                </div>
                <h4>{door.title}</h4>
                <p className="company-muted">
                  {door.owner.name}
                  {door.owner.designation ? ` · ${door.owner.designation}` : ""}
                </p>
                <Link className="company-apply" to="/doors">
                  View in Open Doors
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default CompanyHub;
