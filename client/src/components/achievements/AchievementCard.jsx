import React from "react";
import { Star, Calendar, Building2, Trash2 } from "lucide-react";

const CATEGORY_ICONS = {
  industry: "🏭",
  research: "🔬",
  academic: "🎓",
  entrepreneurship: "🚀",
  government: "🏛️",
  default: "🏆",
};

export default function AchievementCard({ achievement, onClick, authUser, onDelete }) {
  const {
    title,
    recipientName,
    recipientType,
    category,
    awardingBody,
    achievementDate,
    imageUrl,
    isFeatured,
    tags = [],
    description,
    submittedBy,
  } = achievement;

  const categoryIcon = CATEGORY_ICONS[category?.slug] || CATEGORY_ICONS.default;

  const formattedDate = achievementDate
    ? new Date(achievementDate).toLocaleDateString("en-IN", { year: "numeric", month: "short" })
    : null;

  const shortDesc = description
    ? description.length > 85 ? description.slice(0, 85) + "…" : description
    : null;

  const isOwner     = authUser && submittedBy && (
    submittedBy === authUser._id || submittedBy?._id === authUser._id
  );
  const isHeadAdmin = authUser?.isAdmin && authUser?.adminType === "head";
  const canDelete   = isOwner || isHeadAdmin;

  const handleDelete = (e) => {
    e.stopPropagation(); // don't open detail modal
    if (window.confirm("Are you sure you want to delete this achievement? This cannot be undone.")) {
      onDelete && onDelete(achievement._id);
    }
  };

  return (
    <div
      className={`achievement-card${isFeatured ? " is-featured" : ""}`}
      onClick={() => onClick && onClick(achievement)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick && onClick(achievement)}
      title="Click to view details"
    >
      {isFeatured && (
        <div className="featured-badge">
          <Star size={11} fill="currentColor" /> Featured
        </div>
      )}

      {/* Delete button — top-right, only for owner or head admin */}
      {canDelete && (
        <button
          className="card-delete-btn"
          onClick={handleDelete}
          title="Delete achievement"
          aria-label="Delete achievement"
        >
          <Trash2 size={14} />
        </button>
      )}

      {/* Big square image area */}
      <div className="card-image-area" style={{ borderBottom: `3px solid ${category?.color || "#1e3a5f"}` }}>
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="card-image-full" />
        ) : (
          <div className="card-icon-bg" style={{ background: (category?.color || "#1e3a5f") + "15" }}>
            <span className="card-icon-lg">{categoryIcon}</span>
          </div>
        )}
      </div>

      {category && (
        <span className="category-pill" style={{ background: category.color + "20", color: category.color }}>
          {category.name}
        </span>
      )}

      <div className="card-content">
        <h3 className="card-title">{title}</h3>
        {shortDesc && <p className="card-desc">{shortDesc}</p>}

        <div className="card-recipient">
          <span className="recipient-name">{recipientName}</span>
          <span className={`recipient-type ${recipientType}`}>{recipientType}</span>
        </div>

        <div className="card-footer">
          {awardingBody && (
            <div className="card-meta"><Building2 size={12} /><span>{awardingBody}</span></div>
          )}
          {formattedDate && (
            <div className="card-meta"><Calendar size={12} /><span>{formattedDate}</span></div>
          )}
          {tags.length > 0 && (
            <div className="card-tags">
              {tags.slice(0, 3).map((t) => <span key={t} className="tag">#{t}</span>)}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .achievement-card { position: relative; }

        .card-delete-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 10;
          width: 30px;
          height: 30px;
          border-radius: 6px;
          border: 1px solid #fecaca;
          background: #fff0f0;
          color: #dc2626;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.15s, background 0.15s;
        }
        .achievement-card:hover .card-delete-btn {
          opacity: 1;
        }
        .card-delete-btn:hover {
          background: #dc2626;
          color: #fff;
          border-color: #dc2626;
        }
      `}</style>
    </div>
  );
}