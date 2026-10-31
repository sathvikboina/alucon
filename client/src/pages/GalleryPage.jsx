import { useEffect, useState } from 'react';
import axios from 'axios';

/* ── Helpers ─────────────────────────────────────────────── */
const getYouTubeId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
  return match ? match[1] : null;
};

const isCloudinaryVideo = (url) => {
  return url && url.includes('cloudinary.com') && url.includes('/video/upload/');
};

const getCloudinaryThumb = (url) => {
  if (!url) return '';
  return url.replace(/\.[^/.]+$/, ".jpg");
};

/* ── Media Modal ─────────────────────────────────────────────── */
function MediaModal({ item, all, onClose, onNav }) {
  const handleOverlay = (e) => { if (e.target === e.currentTarget) onClose(); };
  const idx = all.findIndex(m => m._id === item?._id);
  useEffect(() => {
    if (!item) return;
    const onKey = (e) => {
      if (e.key === 'Escape')     onClose();
      if (e.key === 'ArrowLeft')  onNav(-1);
      if (e.key === 'ArrowRight') onNav(1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, onNav, item]);
  if (!item) return null;

  return (
    <div className="sc-modal-overlay sc-media-modal-overlay" onClick={handleOverlay}>
      <div className="sc-media-modal-box" role="dialog" aria-modal="true">
        <button className="sc-modal-close sc-media-modal-close" onClick={onClose} aria-label="Close">✕</button>

        {all.length > 1 && (
          <>
            <button className="sc-media-nav sc-media-nav--prev" onClick={() => onNav(-1)} aria-label="Previous">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button className="sc-media-nav sc-media-nav--next" onClick={() => onNav(1)} aria-label="Next">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </>
        )}

        <div className="sc-media-modal-media">
          {item.type === 'video'
            ? (getYouTubeId(item.url)
                ? <iframe title={`video-${item._id}`} src={`https://www.youtube.com/embed/${getYouTubeId(item.url)}?autoplay=1`} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="sc-media-modal-video"></iframe>
                : <video src={item.url} controls autoPlay className="sc-media-modal-video" />)
            : <img src={item.url} alt={item.caption} className="sc-media-modal-img" />
          }
        </div>

        {(item.caption || item.tags?.length > 0 || item.category) && (
          <div className="sc-media-modal-info">
            {item.caption && <p className="sc-media-modal-caption">{item.caption}</p>}
            <div className="sc-media-modal-meta">
              {item.category && <span className="sc-badge sc-badge-gray">{item.category}</span>}
              {item.tags?.map(t => <span key={t} className="sc-tag">{t}</span>)}
            </div>
          </div>
        )}

        {all.length > 1 && (
          <div className="sc-media-modal-counter">{idx + 1} / {all.length}</div>
        )}
      </div>
    </div>
  );
}

export default function GalleryPage() {
  const [media,           setMedia]           = useState([]);
  const [typeFilter,      setTypeFilter]      = useState('all');
  const [categoryFilter,  setCategoryFilter]  = useState('all');
  const [loading,         setLoading]         = useState(true);
  const [selected,        setSelected]        = useState(null);

  useEffect(() => {
    axios.get('/api/showcase/media').then(r => setMedia(r.data)).finally(() => setLoading(false));
  }, []);

  const categories = ['all', ...new Set(media.map(m => m.category).filter(Boolean))];

  const filtered = media
    .filter(m => typeFilter === 'all' || m.type === typeFilter)
    .filter(m => categoryFilter === 'all' || m.category === categoryFilter);

  const navigate = (dir) => {
    const idx = filtered.findIndex(m => m._id === selected._id);
    setSelected(filtered[(idx + dir + filtered.length) % filtered.length]);
  };

  return (
    <section className="sc-gallery-page">
      <h1>Media Gallery</h1>

      <div className="sc-filter-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <div className="sc-filter-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: '600', fontSize: '15px', color: '#333' }}>Type:</span>
          <div className="sc-filter-group" style={{ display: 'flex', gap: '8px' }}>
            {['all', 'image', 'video'].map(f => (
              <button key={f} className={`sc-filter-btn ${typeFilter === f ? 'active' : ''}`}
                onClick={() => setTypeFilter(f)}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
            ))}
          </div>
        </div>
        <div className="sc-filter-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: '600', fontSize: '15px', color: '#333' }}>Category:</span>
          <div className="sc-filter-group" style={{ display: 'flex', gap: '8px' }}>
            {categories.map(c => (
              <button key={c} className={`sc-filter-btn sc-filter-btn-sm ${categoryFilter === c ? 'active' : ''}`}
                onClick={() => setCategoryFilter(c)}>{c === 'all' ? 'All' : c}</button>
            ))}
          </div>
        </div>
      </div>

      {loading
        ? <p className="sc-loading">Loading...</p>
        : !filtered.length
          ? <p className="sc-empty">No media found.</p>
          : (
            <div className="sc-gallery-grid">
              {filtered.map(m => (
                <div
                  key={m._id}
                  className={`sc-gallery-item ${m.isFeatured ? 'sc-featured-item' : ''}`}
                  onClick={() => setSelected(m)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSelected(m)}
                >
                  {m.type === 'image'
                    ? <img src={m.url} alt={m.caption} />
                    : (getYouTubeId(m.url)
                        ? <img src={`https://img.youtube.com/vi/${getYouTubeId(m.url)}/hqdefault.jpg`} alt={m.caption || 'Video'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : isCloudinaryVideo(m.url)
                          ? <img src={getCloudinaryThumb(m.url)} alt={m.caption || 'Video'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <video src={`${m.url}#t=0.1`} preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                  <div className="sc-gallery-overlay">
                    {m.caption && <p className="sc-caption">{m.caption}</p>}
                    {m.tags?.length > 0 && (
                      <div className="sc-tag-row">
                        {m.tags.map(t => <span key={t} className="sc-tag">{t}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

      {selected && (
        <MediaModal
          item={selected}
          all={filtered}
          onClose={() => setSelected(null)}
          onNav={navigate}
        />
      )}
    </section>
  );
}