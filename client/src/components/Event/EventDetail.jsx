import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import "../detail/DetailPage.css";

const statusOf = (event) => {
  const now = new Date();
  const start = new Date(event.startTime || event.Event_post_date);
  const end = new Date(event.endTime || event.Event_post_date);
  if (now < start) return { id: "upcoming", label: "Upcoming" };
  if (now >= start && now <= end) return { id: "live", label: "Live now" };
  return { id: "ended", label: "Ended" };
};

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Date to be announced";

const fmtTime = (iso) =>
  iso
    ? new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

const EventDetail = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    axios
      .get("/api/event/get/getevent")
      .then(({ data }) => {
        if (!alive) return;
        setEvent((data || []).find((item) => item._id === id) || null);
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
        <p className="detail-state">Loading event…</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="detail-page">
        <Link to="/events" className="detail-back">
          ← All events
        </Link>
        <div className="detail-card">
          <h1 className="detail-title">Event not found</h1>
          <p className="detail-body">
            This event may have been removed. Browse the events page for the
            latest sessions.
          </p>
          <div className="detail-actions">
            <Link to="/events" className="detail-btn">
              Browse events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const status = statusOf(event);
  const canJoin = status.id === "live" || status.id === "upcoming";

  return (
    <div className="detail-page">
      <Link to="/events" className="detail-back">
        ← All events
      </Link>

      <div className="detail-card">
        <span className="detail-kicker">Event &amp; webinar</span>
        <h1 className="detail-title">{event.title}</h1>

        <div className="detail-meta">
          <span className="detail-chip accent">{status.label}</span>
          <span className="detail-chip">📅 {fmtDate(event.startTime || event.Event_post_date)}</span>
          {event.startTime && (
            <span className="detail-chip">
              🕒 {fmtTime(event.startTime)}
              {event.endTime ? ` – ${fmtTime(event.endTime)}` : ""}
            </span>
          )}
          {event.Speaker && <span className="detail-chip">🎤 {event.Speaker}</span>}
        </div>

        {event.Speaker && (
          <>
            <div className="detail-divider" />
            <p className="detail-body" style={{ marginBottom: 4 }}>
              <strong>Session by</strong> {event.Speaker}
            </p>
          </>
        )}

        <div className="detail-divider" />
        <p className="detail-body">{event.Description}</p>

        {event.queryEndTime && (
          <>
            <div className="detail-divider" />
            <p className="detail-body" style={{ fontSize: 13, color: "#6b7c93" }}>
              Q&amp;A for this event is handled on the events page
              {new Date(event.queryEndTime) > new Date()
                ? " while the question window is open."
                : " and has now closed."}
            </p>
          </>
        )}

        <div className="detail-actions">
          {canJoin && event.Link && (
            <a
              href={event.Link}
              target="_blank"
              rel="noreferrer"
              className="detail-btn"
            >
              Join here →
            </a>
          )}
          <Link to="/events" className="detail-btn secondary">
            Q&amp;A and all events
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
