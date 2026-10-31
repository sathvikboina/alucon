import React, { useState, useEffect } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../../utils/api";

export default function FeaturedAchievements({ currentUser }) {
  const [featured, setFeatured] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    api
      .get("/featured-achievements")
      .then(({ data }) => setFeatured(data.featured))
      .catch(() => {});
  }, []);

  if (featured.length === 0) return null;

  const active = featured[activeIdx]?.achievement;

  const prev = () =>
    setActiveIdx((i) => (i === 0 ? featured.length - 1 : i - 1));
  const next = () =>
    setActiveIdx((i) => (i === featured.length - 1 ? 0 : i + 1));

  return (
    <section className="featured-section">
      <div className="featured-header">
        <Star size={18} fill="currentColor" />
        <h2>Featured Achievements</h2>
      </div>

      <div className="featured-carousel">
        {featured.length > 1 && (
          <button className="carousel-btn prev" onClick={prev}>
            <ChevronLeft size={20} />
          </button>
        )}

        {active && (
          <div
            className="featured-card"
            style={{
              borderColor: active.category?.color || "#6366f1",
            }}
          >
            {active.imageUrl && (
              <img
                src={active.imageUrl}
                alt={active.title}
                className="featured-image"
              />
            )}
            <div className="featured-content">
              {active.category && (
                <span
                  className="category-pill"
                  style={{
                    background: active.category.color + "22",
                    color: active.category.color,
                  }}
                >
                  {active.category.name}
                </span>
              )}
              <h3>{active.title}</h3>
              <p className="featured-recipient">
                {active.recipientName}
                <span className={`recipient-type ${active.recipientType}`}>
                  {active.recipientType}
                </span>
              </p>
              {active.awardingBody && (
                <p className="featured-body">Awarded by: {active.awardingBody}</p>
              )}
              <p className="featured-description">
                {active.description.length > 200
                  ? active.description.slice(0, 200) + "…"
                  : active.description}
              </p>
            </div>
          </div>
        )}

        {featured.length > 1 && (
          <button className="carousel-btn next" onClick={next}>
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      {/* Dots */}
      {featured.length > 1 && (
        <div className="carousel-dots">
          {featured.map((_, i) => (
            <button
              key={i}
              className={`dot${i === activeIdx ? " active" : ""}`}
              onClick={() => setActiveIdx(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}