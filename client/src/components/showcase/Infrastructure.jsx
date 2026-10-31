import { useEffect, useState } from 'react';
import axios from 'axios';

const CATEGORIES  = ['all', 'lab', 'classroom', 'auditorium', 'sports', 'hostel', 'other'];
const MAX_VISIBLE = 4;

/* ── Infra Detail Modal ──────────────────────────────────────── */
function InfraModal({ item, onClose }) {
  const handleOverlay = (e) => { if (e.target === e.currentTarget) onClose(); };
  useEffect(() => {
    if (!item) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, item]);
  if (!item) return null;

  return (
    <div className="sc-modal-overlay" onClick={handleOverlay}>
      <div className="sc-modal-box" role="dialog" aria-modal="true" aria-label={item.name}>
        <button className="sc-modal-close" onClick={onClose} aria-label="Close">✕</button>

        {item.image && <img src={item.image} alt={item.name} className="sc-modal-hero-img" />}

        <div className="sc-modal-body">
          <div className="sc-badge-row">
            {item.category && <span className="sc-badge sc-badge-gray">{item.category}</span>}
          </div>
          <h2>{item.name}</h2>

          <div className="sc-modal-meta">
            {item.location && (
              <div className="sc-modal-meta-row">
                <span className="sc-modal-meta-label">Location</span>
                <span className="sc-modal-meta-value">📍 {item.location}</span>
              </div>
            )}
            {item.capacity && (
              <div className="sc-modal-meta-row">
                <span className="sc-modal-meta-label">Capacity</span>
                <span className="sc-modal-meta-value">{item.capacity}</span>
              </div>
            )}
          </div>

          {item.description && (
            <>
              <div className="sc-modal-divider" />
              <p className="sc-modal-desc">{item.description}</p>
            </>
          )}

          {item.amenities?.length > 0 && (
            <>
              <div className="sc-modal-divider" />
              <div className="sc-modal-tags">
                {item.amenities.map(a => <span key={a} className="sc-tag">{a}</span>)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Infrastructure() {
  const [infra,    setInfra]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [category, setCategory] = useState('all');
  const [showAll,  setShowAll]  = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    axios.get('/api/showcase/infra').then(r => setInfra(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="sc-loading">Loading...</p>;
  if (!infra.length) return <p className="sc-empty">No infrastructure added yet.</p>;

  const filtered = category === 'all' ? infra : infra.filter(i => i.category === category);
  const visible  = showAll ? filtered : filtered.slice(0, MAX_VISIBLE);
  const hasMore  = filtered.length > MAX_VISIBLE;

  return (
    <div>
      <div className="sc-filter-row" style={{ flexWrap: 'wrap' }}>
        {CATEGORIES.map(c => (
          <button key={c}
            className={`sc-filter-btn ${category === c ? 'active' : ''}`}
            onClick={() => { setCategory(c); setShowAll(false); }}>{c}</button>
        ))}
      </div>

      <div className="sc-card-grid">
        {visible.map(item => (
          <div
            key={item._id}
            className={`sc-card ${!item.isAvailable ? 'sc-unavailable' : ''}`}
            onClick={() => setSelected(item)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setSelected(item)}
          >
            {item.image && <img src={item.image} alt={item.name} className="sc-card-img" />}
            <div className="sc-card-body">
              <div className="sc-badge-row">
                {item.category && <span className="sc-badge sc-badge-gray">{item.category}</span>}
              </div>
              <h3>{item.name}</h3>
              {item.location && <small className="sc-location">📍 {item.location}</small>}
              {item.capacity  && <p><strong>Capacity:</strong> {item.capacity}</p>}
              {item.description && <p>{item.description}</p>}
              {item.amenities?.length > 0 && (
                <div className="sc-amenities">
                  {item.amenities.map(a => <span key={a} className="sc-tag">{a}</span>)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="sc-view-all-row">
          <button className="sc-view-all-btn" onClick={() => setShowAll(v => !v)}>
            {showAll ? 'Show Less ↑' : `View All ${filtered.length} Facilities →`}
          </button>
        </div>
      )}

      {selected && <InfraModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}