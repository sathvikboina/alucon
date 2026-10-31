import { useEffect, useState } from 'react';
import axios from 'axios';

const TYPES = ['all', 'journal', 'conference', 'thesis', 'patent', 'other'];

/* ── Research Detail Modal ───────────────────────────────────── */
function ResearchModal({ item: r, onClose }) {
  const handleOverlay = (e) => { if (e.target === e.currentTarget) onClose(); };
  useEffect(() => {
    if (!r) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, r]);
  if (!r) return null;

  return (
    <div className="sc-modal-overlay" onClick={handleOverlay}>
      <div className="sc-modal-box" role="dialog" aria-modal="true" aria-label={r.title}>
        <button className="sc-modal-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="sc-modal-body">
          <div className="sc-badge-row">
            {r.publishedYear && <span className="sc-badge">{r.publishedYear}</span>}
            {r.type   && <span className="sc-badge sc-badge-gray">{r.type}</span>}
            {r.domain && <span className="sc-badge sc-badge-teal">{r.domain}</span>}
            {r.isFeatured && <span className="sc-badge sc-badge-gold">⭐ Featured</span>}
          </div>

          <h2 className="sc-modal-title-sm">{r.title}</h2>

          <div className="sc-modal-meta">
            {r.authors?.length > 0 && (
              <div className="sc-modal-meta-row">
                <span className="sc-modal-meta-label">Authors</span>
                <span className="sc-modal-meta-value">{r.authors.join(', ')}</span>
              </div>
            )}
            {r.journal && (
              <div className="sc-modal-meta-row">
                <span className="sc-modal-meta-label">Published in</span>
                <span className="sc-modal-meta-value" style={{ fontStyle: 'italic' }}>{r.journal}</span>
              </div>
            )}
            {r.doi && (
              <div className="sc-modal-meta-row">
                <span className="sc-modal-meta-label">DOI</span>
                <span className="sc-modal-meta-value sc-doi">{r.doi}</span>
              </div>
            )}
          </div>

          {r.abstract && (
            <>
              <div className="sc-modal-divider" />
              <p className="sc-modal-abstract">{r.abstract}</p>
            </>
          )}

          {r.link && (
            <div className="sc-modal-actions">
              <a href={r.link} target="_blank" rel="noreferrer" className="sc-modal-action-btn">
                Read Paper →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResearchHighlights() {
  const [research, setResearch] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    axios.get('/api/showcase/research')
      .then(r => setResearch(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="sc-loading">Loading...</p>;
  if (!research.length) return <p className="sc-empty">No research added yet.</p>;

  const filtered = filter === 'all' ? research : research.filter(r => r.type === filter);

  return (
    <div>
      <div className="sc-filter-row">
        {TYPES.map(t => (
          <button key={t} className={`sc-filter-btn ${filter === t ? 'active' : ''}`}
            onClick={() => setFilter(t)}>{t}</button>
        ))}
      </div>

      <div className="sc-list">
        {filtered.map(r => (
          <div
            key={r._id}
            className={`sc-list-item ${r.isFeatured ? 'sc-featured-border' : ''}`}
            onClick={() => setSelected(r)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setSelected(r)}
          >
            <div className="sc-list-meta">
              {r.publishedYear && <span className="sc-badge">{r.publishedYear}</span>}
              {r.type   && <span className="sc-badge sc-badge-gray">{r.type}</span>}
              {r.domain && <span className="sc-badge sc-badge-teal">{r.domain}</span>}
            </div>
            <h3>{r.title}</h3>
            {r.authors?.length > 0 && (
              <p className="sc-author">by {r.authors.join(', ')}</p>
            )}
            {r.journal  && <small className="sc-journal">Published in: {r.journal}</small>}
            {r.abstract && <p className="sc-abstract">{r.abstract}</p>}
            <div className="sc-list-actions">
              {r.link && (
                <a href={r.link} target="_blank" rel="noreferrer" className="sc-link"
                   onClick={e => e.stopPropagation()}>Read Paper →</a>
              )}
              {r.doi && <span className="sc-doi">DOI: {r.doi}</span>}
            </div>
          </div>
        ))}
      </div>

      {selected && <ResearchModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}