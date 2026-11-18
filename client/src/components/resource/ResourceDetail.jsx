import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import "../detail/DetailPage.css";

const isPdf = (url = "") =>
  url.includes("/raw/") || url.toLowerCase().includes(".pdf");

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

const ResourceDetail = () => {
  const { id } = useParams();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    axios
      .get("/api/resources")
      .then(({ data }) => {
        if (!alive) return;
        setResource((data || []).find((item) => item._id === id) || null);
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
        <p className="detail-state">Loading resource…</p>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="detail-page">
        <Link to="/resources" className="detail-back">
          ← Resource hub
        </Link>
        <div className="detail-card">
          <h1 className="detail-title">Resource not found</h1>
          <p className="detail-body">
            This file may have been removed. Browse the resource hub for
            community notes, guides and templates.
          </p>
          <div className="detail-actions">
            <Link to="/resources" className="detail-btn">
              Browse resources
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const pdf = isPdf(resource.fileUrl);
  const uploader = resource.uploadedBy;

  return (
    <div className="detail-page">
      <Link to="/resources" className="detail-back">
        ← Resource hub
      </Link>

      <div className="detail-card">
        <span className="detail-kicker">
          {resource.topic || "General"} · Community resource
        </span>
        <h1 className="detail-title">{resource.title}</h1>

        <div className="detail-meta">
          <span className="detail-chip accent">{resource.topic || "General"}</span>
          {pdf ? (
            <span className="detail-chip">📄 PDF document</span>
          ) : (
            <span className="detail-chip">🖼️ Image</span>
          )}
          {resource.createdAt && (
            <span className="detail-chip">Added {fmtDate(resource.createdAt)}</span>
          )}
          {uploader?.name && (
            <span className="detail-chip">
              By{" "}
              {uploader._id ? (
                <Link to={`/profile/${uploader._id}`} className="detail-link">
                  {uploader.name}
                </Link>
              ) : (
                uploader.name
              )}
            </span>
          )}
        </div>

        <div className="detail-divider" />

        {pdf ? (
          <a
            href={resource.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="detail-pdf"
          >
            📄 Open “{resource.title}” in a new tab
          </a>
        ) : (
          <img
            src={resource.fileUrl}
            alt={resource.title}
            className="detail-preview"
          />
        )}

        <div className="detail-actions">
          <a
            href={resource.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="detail-btn"
          >
            {pdf ? "Open PDF" : "View image"}
          </a>
          <a
            href={resource.fileUrl}
            download={resource.title}
            className="detail-btn secondary"
          >
            Download
          </a>
          <Link to="/resources" className="detail-btn secondary">
            Back to hub
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResourceDetail;
