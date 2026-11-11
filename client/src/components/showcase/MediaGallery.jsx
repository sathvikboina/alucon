import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function getYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match && match[1] ? match[1] : null;
}

/* ── Video thumbnail generator ───────────────────────────────── */
function VideoThumb({ src, caption }) {
  const ytId = getYouTubeId(src);
  const ytThumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [thumb, setThumb] = useState(ytThumb);

  useEffect(() => {
    if (ytThumb) {
      setThumb(ytThumb);
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    const capture = () => {
      try {
        const canvas = canvasRef.current;
        canvas.width  = video.videoWidth  || 320;
        canvas.height = video.videoHeight || 180;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        setThumb(canvas.toDataURL('image/jpeg', 0.8));
      } catch (_) {}
    };
    video.addEventListener('seeked', capture);
    video.addEventListener('loadeddata', () => { video.currentTime = 1; });
    return () => video.removeEventListener('seeked', capture);
  }, [src, ytThumb]);

  return (
    <>
      {!ytThumb && <video ref={videoRef} src={src} muted playsInline crossOrigin="anonymous" style={{ display: 'none' }} />}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {thumb
        ? <img src={thumb} alt={caption || 'video thumbnail'} />
        : (
          <div className="sc-video-thumb-fallback">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" fill="rgba(255,255,255,0.9)" stroke="none"/>
            </svg>
          </div>
        )}
      <div className="sc-video-play-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      </div>
    </>
  );
}

/* ── Media Modal ─────────────────────────────────────────────── */
function MediaModal({ item, all, onClose, onNav }) {
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

  const handleOverlay = (e) => { if (e.target === e.currentTarget) onClose(); };
  return (
    <div className="sc-modal-overlay sc-media-modal-overlay" onClick={handleOverlay}>
      <div className="sc-media-modal-box" role="dialog" aria-modal="true">
        {/* Close */}
        <button className="sc-modal-close sc-media-modal-close" onClick={onClose} aria-label="Close">✕</button>

        {/* Prev / Next */}
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

        {/* Media */}
        <div className="sc-media-modal-media">
          {item.type === 'video' ? (
            getYouTubeId(item.url) ? (
              <iframe
                src={`https://www.youtube.com/embed/${getYouTubeId(item.url)}?autoplay=1`}
                className="sc-media-modal-video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={item.caption || "YouTube Video"}
              />
            ) : (
              <video src={item.url} controls autoPlay className="sc-media-modal-video" />
            )
          ) : (
            <img src={item.url} alt={item.caption} className="sc-media-modal-img" />
          )}
        </div>

        {/* Info strip */}
        {(item.caption || item.tags?.length > 0 || item.category) && (
          <div className="sc-media-modal-info">
            {item.caption && <p className="sc-media-modal-caption">{item.caption}</p>}
            <div className="sc-media-modal-meta">
              {item.category && <span className="sc-badge sc-badge-gray">{item.category}</span>}
              {item.tags?.map(t => <span key={t} className="sc-tag">{t}</span>)}
            </div>
          </div>
        )}

        {/* Counter */}
        {all.length > 1 && (
          <div className="sc-media-modal-counter">{idx + 1} / {all.length}</div>
        )}
      </div>
    </div>
  );
}

const MAX_VISIBLE = 4;

export default function MediaGallery() {
  const [media,    setMedia]    = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    axios.get('/api/showcase/media').then(r => setMedia(r.data));
  }, []);

  const visible = media.slice(0, MAX_VISIBLE);

  const openModal = (item) => setSelected(item);

  const navigate = (dir) => {
    const visibleList = media.slice(0, MAX_VISIBLE);
    const idx = visibleList.findIndex(m => m._id === selected._id);
    const next = (idx + dir + visibleList.length) % visibleList.length;
    setSelected(visibleList[next]);
  };

  return (
    <section className="sc-media-gallery">
      <h2>Media</h2>

      <div className="sc-gallery-grid">
        {visible.map(m => (
          <div
            key={m._id}
            className={`sc-gallery-item ${m.isFeatured ? 'sc-featured-item' : ''}`}
            onClick={() => openModal(m)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && openModal(m)}
          >
            {m.type === 'video'
              ? <VideoThumb src={m.url} caption={m.caption} />
              : <img src={m.url} alt={m.caption} />}
            <div className="sc-gallery-overlay">
              {m.caption && <p className="sc-caption">{m.caption}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="sc-media-footer">
        <Link to="/gallery" className="sc-view-all">Full Gallery →</Link>
      </div>

      {selected && (
        <MediaModal
          item={selected}
          all={media}
          onClose={() => setSelected(null)}
          onNav={navigate}
        />
      )}
    </section>
  );
}