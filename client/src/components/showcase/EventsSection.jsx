import { useEffect, useState } from 'react';
import axios from 'axios';

const CATEGORIES  = ['all', 'technical', 'cultural', 'sports', 'seminar', 'other'];
const MAX_VISIBLE = 4;

/* ── Event Detail Modal ──────────────────────────────────────── */
function EventModal({ event: e, onClose }) {
  const handleOverlay = (ev) => { if (ev.target === ev.currentTarget) onClose(); };
  useEffect(() => {
    if (!e) return;
    const onKey = (ev) => { if (ev.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, e]);
  if (!e) return null;

  const dateStr = e.date
    ? new Date(e.date).toDateString() + (e.endDate ? ` – ${new Date(e.endDate).toDateString()}` : '')
    : null;

  return (
    <div className="sc-modal-overlay" onClick={handleOverlay}>
      <div className="sc-modal-box" role="dialog" aria-modal="true" aria-label={e.title}>
        <button className="sc-modal-close" onClick={onClose} aria-label="Close">✕</button>

        {e.image && <img src={e.image} alt={e.title} className="sc-modal-hero-img" />}

        <div className="sc-modal-body">
          <div className="sc-badge-row">
            {e.isLandmark && <span className="sc-badge sc-badge-gold">⭐ Landmark</span>}
            {e.category   && <span className="sc-badge sc-badge-gray">{e.category}</span>}
          </div>
          <h2>{e.title}</h2>

          <div className="sc-modal-meta">
            {dateStr && (
              <div className="sc-modal-meta-row">
                <span className="sc-modal-meta-label">Date</span>
                <span className="sc-modal-meta-value">{dateStr}</span>
              </div>
            )}
            {e.venue && (
              <div className="sc-modal-meta-row">
                <span className="sc-modal-meta-label">Venue</span>
                <span className="sc-modal-meta-value">📍 {e.venue}</span>
              </div>
            )}
            {e.organizer && (
              <div className="sc-modal-meta-row">
                <span className="sc-modal-meta-label">Organizer</span>
                <span className="sc-modal-meta-value">{e.organizer}</span>
              </div>
            )}
          </div>

          {e.description && (
            <>
              <div className="sc-modal-divider" />
              <p className="sc-modal-desc">{e.description}</p>
            </>
          )}

          {e.registrationLink && (
            <div className="sc-modal-actions">
              <a href={e.registrationLink} target="_blank" rel="noreferrer" className="sc-modal-action-btn">
                Register →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EventsSection() {
  const [events,       setEvents]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [category,     setCategory]     = useState('all');
  const [landmarkOnly, setLandmarkOnly] = useState(false);
  const [showAll,      setShowAll]      = useState(false);
  const [selected,     setSelected]     = useState(null);

  useEffect(() => {
    axios.get('/api/showcase/events').then(r => setEvents(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="sc-loading">Loading...</p>;

  const filtered = events
    .filter(e => category === 'all' || e.category === category)
    .filter(e => !landmarkOnly || e.isLandmark);

  const visible = showAll ? filtered : filtered.slice(0, MAX_VISIBLE);
  const hasMore = filtered.length > MAX_VISIBLE;

  return (
    <div>
      <div className="sc-filter-row" style={{ flexWrap: 'wrap' }}>
        {CATEGORIES.map(c => (
          <button key={c}
            className={`sc-filter-btn ${category === c ? 'active' : ''}`}
            onClick={() => { setCategory(c); setShowAll(false); }}>{c}</button>
        ))}
        <button
          className={`sc-filter-btn sc-filter-btn-gold ${landmarkOnly ? 'active-gold' : ''}`}
          onClick={() => { setLandmarkOnly(p => !p); setShowAll(false); }}>⭐ Landmark</button>
      </div>

      {!filtered.length
        ? <p className="sc-empty">No events found.</p>
        : (
          <>
            <div className="sc-card-grid">
              {visible.map(e => (
                <div
                  key={e._id}
                  className={`sc-card ${e.isLandmark ? 'sc-landmark' : ''}`}
                  onClick={() => setSelected(e)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(ev) => ev.key === 'Enter' && setSelected(e)}
                >
                  {e.image && <img src={e.image} alt={e.title} className="sc-card-img" />}
                  <div className="sc-card-body">
                    <div className="sc-badge-row">
                      {e.isLandmark && <span className="sc-badge sc-badge-gold">⭐ Landmark</span>}
                      {e.category   && <span className="sc-badge sc-badge-gray">{e.category}</span>}
                    </div>
                    <h3>{e.title}</h3>
                    <small>
                      {e.date && new Date(e.date).toDateString()}
                      {e.endDate && ` – ${new Date(e.endDate).toDateString()}`}
                    </small>
                    {e.venue     && <p className="sc-venue">📍 {e.venue}</p>}
                    {e.organizer && <small className="sc-organizer">By: {e.organizer}</small>}
                    {e.description && <p>{e.description}</p>}
                    {e.registrationLink && (
                      <a href={e.registrationLink} target="_blank" rel="noreferrer" className="sc-link"
                         onClick={ev => ev.stopPropagation()}>Register →</a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="sc-view-all-row">
                <button className="sc-view-all-btn" onClick={() => setShowAll(v => !v)}>
                  {showAll ? 'Show Less ↑' : `View All ${filtered.length} Events →`}
                </button>
              </div>
            )}
          </>
        )}

      {selected && <EventModal event={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}