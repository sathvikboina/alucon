import { useEffect, useState, useCallback } from "react";
import './showcase.css';

const SLIDES = [
  {
    src: "https://live.staticflickr.com/65535/53166876895_79793fef8a_b.jpg",
    alt: "IIIT Allahabad campus",},
  {
    src: "https://live.staticflickr.com/65535/53924935235_8a432bb726_b.jpg",
    alt: "IIIT Allahabad academic block",
  },
  {
    src: "https://live.staticflickr.com/65535/53649207556_470bd3b3e1_c.jpg",
    alt: "IIIT Allahabad research labs",
  },
  {
    src: "https://live.staticflickr.com/65535/53593419300_c3bbdcce37_b.jpg",
    alt: "IIIT Allahabad convocation",
  },
];

const SLIDE_INTERVAL = 5000;

export default function HeroSection() {
  const [scrollY, setScrollY]   = useState(0);
  const [loaded,  setLoaded]    = useState(false);
  const [current, setCurrent]   = useState(0);
  const [paused,  setPaused]    = useState(false);

  /* scroll parallax */
  useEffect(() => {
    setLoaded(true);
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* auto-advance */
  const next = useCallback(() => setCurrent(c => (c + 1) % SLIDES.length), []);
  const prev = useCallback(() => setCurrent(c => (c - 1 + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, SLIDE_INTERVAL);
    return () => clearInterval(id);
  }, [paused, next]);

  const stats = [
    { label: "Est.",    value: "1999"    },
    { label: "Students",value: "2718+"  },
    { label: "Faculty", value: "80+"    },
    { label: "Alumni",  value: "9800+" },
  ];

  return (
    <section
      className={`sc-hero ${loaded ? "sc-hero--loaded" : ""}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Slideshow background ── */}
      <div className="sc-hero-slides">
        {SLIDES.map((slide, i) => (
          <div
            key={i}
            className={`sc-hero-slide ${i === current ? "sc-hero-slide--active" : ""}`}
            style={{ transform: i === current ? `translateY(${scrollY * 0.35}px)` : undefined }}
          >
            <img src={slide.src} alt={slide.alt} className="sc-hero-bg-img" />
            <div className="sc-hero-overlay" />
          </div>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="sc-hero-content">
        <div className="sc-hero-badge">
          <span className="sc-hero-badge-dot" />
          Premier Institute of National Importance
        </div>

        <h1 className="sc-hero-title">
          Indian Institute of Information Technology
          <span className="sc-hero-title-accent"> Allahabad</span>
        </h1>

        <p className="sc-hero-subtitle">
          {SLIDES[current].caption}
        </p>
{/* 
        <div className="sc-hero-actions">
          <a href="/signup"  className="sc-hero-btn sc-hero-btn--primary">Explore &amp; Sign Up</a>
          <a href="#highlights" className="sc-hero-btn sc-hero-btn--ghost">Explore Our Legacy</a>
        </div> */}

        <div className="sc-hero-stats">
          {stats.map(({ label, value }) => (
            <div className="sc-hero-stat" key={label}>
              <span className="sc-hero-stat-value">{value}</span>
              <span className="sc-hero-stat-label">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Prev / Next arrows ── */}
      <button className="sc-slide-arrow sc-slide-arrow--prev" onClick={prev} aria-label="Previous slide">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <button className="sc-slide-arrow sc-slide-arrow--next" onClick={next} aria-label="Next slide">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>

      {/* ── Dot indicators ── */}
      <div className="sc-slide-dots">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            className={`sc-slide-dot ${i === current ? "active" : ""}`}
            onClick={() => setCurrent(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* ── Progress bar ── */}
      <div className="sc-slide-progress" key={`${current}-${paused}`}>
        {!paused && <div className="sc-slide-progress-bar" style={{ animationDuration: `${SLIDE_INTERVAL}ms` }} />}
      </div>

      {/* ── Scroll cue ── */}
      <a href="#highlights" className="sc-hero-scroll-cue" aria-label="Scroll down">
        <span className="sc-hero-scroll-arrow" />
      </a>
    </section>
  );
}