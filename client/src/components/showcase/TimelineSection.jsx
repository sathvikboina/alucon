import { useEffect, useState } from 'react';
import axios from 'axios';

/* ── Timeline Detail Modal ───────────────────────────────────── */
function TimelineModal({ item, onClose }) {
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
      <div className="sc-modal-box" role="dialog" aria-modal="true" aria-label={item.title}>
        <button className="sc-modal-close" onClick={onClose} aria-label="Close">✕</button>

        {item.image && <img src={item.image} alt={item.title} className="sc-modal-hero-img" />}

        <div className="sc-modal-body">
          <div className="sc-badge-row">
            {item.category   && <span className="sc-badge sc-badge-gray">{item.category}</span>}
            {item.isHighlight && <span className="sc-badge sc-badge-gold">⭐ Highlight</span>}
          </div>

          <div className="sc-modal-year">{item.year}</div>
          <h2 className="sc-modal-title-sm">{item.title}</h2>

          <div className="sc-modal-divider" />
          <p className="sc-modal-desc">{item.description}</p>
        </div>
      </div>
    </div>
  );
}

export default function TimelineSection() {
  const [items,         setItems]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [highlightOnly, setHighlightOnly] = useState(false);
  const [selected,      setSelected]      = useState(null);

  useEffect(() => {
    axios.get('/api/showcase/timeline')
      .then(r => setItems(r.data.sort((a, b) => a.year - b.year)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="sc-loading">Loading...</p>;
  if (!items.length) return <p className="sc-empty">No timeline entries yet.</p>;

  const filtered = highlightOnly ? items.filter(i => i.isHighlight) : items;

  return (
    <section className="sc-timeline">
      <div className="sc-timeline-header">
        <h2>Our Journey</h2>
        <button className={`sc-filter-btn ${highlightOnly ? 'active' : ''}`}
          onClick={() => setHighlightOnly(p => !p)}>⭐ Highlights Only</button>
      </div>

      <div className="sc-timeline-track">
        {filtered.map((item, i) => (
          <div key={item._id} className={`sc-timeline-item ${i % 2 === 0 ? 'left' : 'right'}`}>
            <div className="sc-timeline-dot" />
            <div
              className={`sc-timeline-card ${item.isHighlight ? 'sc-highlight-card' : ''}`}
              onClick={() => setSelected(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelected(item)}
            >
              <div className="sc-badge-row">
                <span className="sc-year">{item.year}</span>
                {item.category && <span className="sc-badge sc-badge-gray">{item.category}</span>}
                {item.isHighlight && <span className="sc-badge sc-badge-gold">⭐</span>}
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              {item.image && <img src={item.image} alt={item.title} className="sc-timeline-img" />}
            </div>
          </div>
        ))}
      </div>

      {selected && <TimelineModal item={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}