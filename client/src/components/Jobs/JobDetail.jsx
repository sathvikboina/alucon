import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../utils/api";
import "../detail/DetailPage.css";

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Not specified";

const JobDetail = () => {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .get("/api/job/get/getjob")
      .then(({ data }) => {
        if (!alive) return;
        const all = [...(data.dt || []), ...(data.archive || [])];
        setJob(all.find((item) => item._id === id) || null);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="detail-page">
        <p className="detail-state">Loading opportunity…</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="detail-page">
        <Link to="/jobs" className="detail-back">
          ← All opportunities
        </Link>
        <div className="detail-card">
          <h1 className="detail-title">Opportunity not found</h1>
          <p className="detail-body">
            This role may have been filled or removed. Browse the job board for
            current openings.
          </p>
          <div className="detail-actions">
            <Link to="/jobs" className="detail-btn">
              Browse jobs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const closing = job.Job_deadline
    ? new Date(job.Job_deadline) < new Date()
    : false;

  return (
    <div className="detail-page">
      <Link to="/jobs" className="detail-back">
        ← All opportunities
      </Link>

      <div className="detail-card">
        <span className="detail-kicker">
          {job.job_type || "Opportunity"}
          {job.companyName ? ` · ${job.companyName}` : ""}
        </span>
        <h1 className="detail-title">{job.Job_name}</h1>

        <div className="detail-meta">
          {job.job_type && <span className="detail-chip accent">{job.job_type}</span>}
          {job.work_mode && <span className="detail-chip">{job.work_mode}</span>}
          {job.location && <span className="detail-chip">📍 {job.location}</span>}
          <span className={`detail-chip ${closing ? "" : "accent"}`}>
            {closing ? "Closed" : "Apply by"} {fmtDate(job.Job_deadline)}
          </span>
        </div>

        <div className="detail-meta">
          {job.companyName && job.companySlug && (
            <span>
              Company:{" "}
              <Link to={`/company/${job.companySlug}`} className="detail-link">
                {job.companyName}
              </Link>
            </span>
          )}
          {job.userID && (
            <span>
              Posted by:{" "}
              <Link to={`/profile/${job.userID}`} className="detail-link">
                {job.created_by_user || "Alumnus"}
              </Link>
            </span>
          )}
          <span>Posted {fmtDate(job.Job_post_date)}</span>
        </div>

        <div className="detail-divider" />
        <p className="detail-body">{job.Description}</p>

        {job.skills && (
          <>
            <div className="detail-divider" />
            <p className="detail-body" style={{ fontSize: 13.5 }}>
              <strong>Skills:</strong>{" "}
              {Array.isArray(job.skills) ? job.skills.join(", ") : job.skills}
            </p>
          </>
        )}

        <div className="detail-actions">
          {job.Link && !closing && (
            <a
              href={job.Link}
              target="_blank"
              rel="noreferrer"
              className="detail-btn"
            >
              Apply for this role →
            </a>
          )}
          <Link to="/jobs" className="detail-btn secondary">
            Back to job board
          </Link>
          <Link to="/internship-matches" className="detail-btn secondary">
            See your matches
          </Link>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
