import { useEffect, useState } from 'react';
import axios from 'axios';

const MAX_VISIBLE = 4;

/* ── Alumni Detail Modal ─────────────────────────────────────── */
function AlumniModal({ alumni: a, onClose }) {
  const handleOverlay = (e) => { if (e.target === e.currentTarget) onClose(); };
  useEffect(() => {
    if (!a) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, a]);
  if (!a) return null;

  return (
    <div className="sc-modal-overlay" onClick={handleOverlay}>
      <div className="sc-modal-box" role="dialog" aria-modal="true" aria-label={a.name}>
        <button className="sc-modal-close" onClick={onClose} aria-label="Close">✕</button>

        {a.photo && <img src={a.photo} alt={a.name} className="sc-modal-hero-img" />}

        <div className="sc-modal-body">
          <div className="sc-modal-top">
            {!a.photo && (
              <div className="sc-modal-avatar-placeholder">{a.name?.[0]}</div>
            )}
            <div>
              <div className="sc-badge-row">
                <span className="sc-badge">Batch {a.batch}</span>
                {a.degree && <span className="sc-badge sc-badge-gray">{a.degree}</span>}
                {a.isFeature && <span className="sc-badge sc-badge-gold">⭐ Featured</span>}
              </div>
              <h2>{a.name}</h2>
            </div>
          </div>

          <div className="sc-modal-meta">
            {a.currentRole && (
              <div className="sc-modal-meta-row">
                <span className="sc-modal-meta-label">Role</span>
                <span className="sc-modal-meta-value"><strong>{a.currentRole}</strong>{a.company ? ` @ ${a.company}` : ''}</span>
              </div>
            )}
            {a.location && (
              <div className="sc-modal-meta-row">
                <span className="sc-modal-meta-label">Location</span>
                <span className="sc-modal-meta-value">📍 {a.location}</span>
              </div>
            )}
            {a.email && (
              <div className="sc-modal-meta-row">
                <span className="sc-modal-meta-label">Email</span>
                <span className="sc-modal-meta-value">{a.email}</span>
              </div>
            )}
          </div>

          {a.achievement && (
            <>
              <div className="sc-modal-divider" />
              <p className="sc-modal-desc">{a.achievement}</p>
            </>
          )}

          {a.linkedin && (
            <div className="sc-modal-actions">
              <a href={a.linkedin} target="_blank" rel="noreferrer" className="sc-modal-action-btn">LinkedIn →</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AlumniStories() {
  const [alumni,   setAlumni]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [featured, setFeatured] = useState(false);
  const [showAll,  setShowAll]  = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setShowAll(false);
    const url = featured ? '/api/showcase/alumni?isFeatured=true' : '/api/showcase/alumni';
    axios.get(url).then(r => setAlumni(r.data)).finally(() => setLoading(false));
  }, [featured]);

  if (loading) return <p className="sc-loading">Loading...</p>;
  if (!alumni.length) return <p className="sc-empty">No alumni added yet.</p>;

  const visible = showAll ? alumni : alumni.slice(0, MAX_VISIBLE);
  const hasMore = alumni.length > MAX_VISIBLE;

  return (
    <div>
      <div className="sc-filter-row">
        <button className={`sc-filter-btn ${!featured ? 'active' : ''}`} onClick={() => setFeatured(false)}>All</button>
        <button className={`sc-filter-btn ${featured  ? 'active' : ''}`} onClick={() => setFeatured(true)}>Featured</button>
      </div>

      <div className="sc-card-grid">
        {visible.map(a => (
          <div
            key={a._id}
            className={`sc-card ${a.isFeature ? 'sc-featured' : ''}`}
            onClick={() => setSelected(a)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setSelected(a)}
          >
            {a.photo
              ? <img src={a.photo} alt={a.name} className="sc-card-img" />
              : <div className="sc-card-img sc-avatar-placeholder">{a.name?.[0]}</div>
            }
            <div className="sc-card-body">
              <h3>{a.name}</h3>
              <div className="sc-badge-row">
                <span className="sc-badge">Batch {a.batch}</span>
                {a.degree && <span className="sc-badge sc-badge-gray">{a.degree}</span>}
              </div>
              {a.currentRole && <p className="sc-role"><strong>{a.currentRole}</strong>{a.company ? ` @ ${a.company}` : ''}</p>}
              {a.location    && <small className="sc-location">📍 {a.location}</small>}
              {a.achievement && <p className="sc-achieve">{a.achievement}</p>}
              {a.linkedin    && (
                <a href={a.linkedin} target="_blank" rel="noreferrer" className="sc-link"
                   onClick={e => e.stopPropagation()}>LinkedIn →</a>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="sc-view-all-row">
          <button className="sc-view-all-btn" onClick={() => setShowAll(v => !v)}>
            {showAll ? 'Show Less ↑' : `View All ${alumni.length} Alumni →`}
          </button>
        </div>
      )}

      {selected && <AlumniModal alumni={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}