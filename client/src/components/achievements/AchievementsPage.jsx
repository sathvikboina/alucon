import React, { useState, useEffect, useCallback } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import AchievementCard from "./AchievementCard";
import AchievementFilter from "./AchievementFilter";
import SubmitAchievementForm from "./SubmitAchievementForm";
import { Trophy, Loader2, AlertCircle, Plus, X, Building2, Calendar, Tag, Star } from "lucide-react";
import api from "../../utils/api";
import { setAlert } from "../../actions/alert";
import "./achievements.css";

// ── Detail Modal ─────────────────────────────────────────────────────────────
function AchievementDetailModal({ achievement, onClose }) {
  if (!achievement) return null;
  const {
    title, description, recipientName, recipientType,
    category, awardingBody, achievementDate, imageUrl,
    proofDocumentUrl, tags = [], isFeatured,
  } = achievement;

  const formattedDate = achievementDate
    ? new Date(achievementDate).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>

        {imageUrl && (
          <div className="detail-image-wrap">
            <img src={imageUrl} alt={title} className="detail-image" />
          </div>
        )}

        <div className="detail-body">
          <div className="detail-top">
            {category && (
              <span className="category-pill" style={{ background: category.color + "20", color: category.color }}>
                {category.name}
              </span>
            )}
            {isFeatured && (
              <span className="featured-badge" style={{ position: "static", marginLeft: 8 }}>
                <Star size={11} fill="currentColor" /> Featured
              </span>
            )}
          </div>

          <h2 className="detail-title">{title}</h2>

          <div className="detail-recipient">
            <span className="recipient-name">{recipientName}</span>
            <span className={`recipient-type ${recipientType}`}>{recipientType}</span>
          </div>

          <p className="detail-description">{description}</p>

          <div className="detail-meta-grid">
            {awardingBody && (
              <div className="detail-meta-item">
                <Building2 size={15} />
                <div>
                  <span className="meta-label">Awarded by</span>
                  <span className="meta-value">{awardingBody}</span>
                </div>
              </div>
            )}
            {formattedDate && (
              <div className="detail-meta-item">
                <Calendar size={15} />
                <div>
                  <span className="meta-label">Date received</span>
                  <span className="meta-value">{formattedDate}</span>
                </div>
              </div>
            )}
          </div>

          {tags.length > 0 && (
            <div className="detail-tags">
              <Tag size={13} />
              {tags.map((t) => <span key={t} className="tag">#{t}</span>)}
            </div>
          )}

          {proofDocumentUrl && (
            <a href={proofDocumentUrl} target="_blank" rel="noreferrer" className="proof-link">
              View Proof Document →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const AchievementsPage = ({ auth, setAlert, embedded = false }) => {
  const authUser = auth?.authUser;
  const [achievements, setAchievements] = useState([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [pages, setPages]               = useState(1);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState(null);

  const [filters, setFilters] = useState({ category: "", recipientType: "", search: "" });
  const [showAll, setShowAll] = useState(false);

  const canSubmit =
    authUser?.role === "alumni" ||
    authUser?.role === "faculty" ||
    authUser?.role === "professor";

  const fetchAchievements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page, limit: 12,
        ...(filters.category      && { category: filters.category }),
        ...(filters.recipientType && { recipientType: filters.recipientType }),
        ...(filters.search        && { search: filters.search }),
      });
      const { data } = await api.get(`/api/achievements?${params}`);
      setAchievements(data.achievements);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      setError("Failed to load achievements.");
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchAchievements(); }, [fetchAchievements]);

  const handleFilterChange = (newFilters) => { setFilters(newFilters); setPage(1); setShowAll(false); };
  const handleSubmitSuccess = (isEditing) => {
    setShowSubmitModal(false);
    setAlert(isEditing ? "Achievement updated and sent for review." : "Achievement submitted for review.", "success");
    fetchAchievements();
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/achievements/${id}`);
      setAlert("Achievement deleted.", "success");
      setAchievements((prev) => prev.filter((a) => a._id !== id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      setAlert(err.response?.data?.message || "Failed to delete achievement.", "danger");
    }
  };

  return (
    <div className={`achievements-page${embedded ? " achievements-page--embedded" : ""}`}>
      {/* Hero */}
      {embedded ? (
        <div className="achievements-embedded-toolbar">
          <div>
            <h2>Awards &amp; Achievements</h2>
            <p>Celebrating the milestones of our alumni and faculty</p>
          </div>
          {canSubmit && (
            <button className="submit-achievement-btn" onClick={() => setShowSubmitModal(true)}>
              <Plus size={16} /> Submit Your Achievement
            </button>
          )}
        </div>
      ) : (
        <div className="achievements-hero">
          <Trophy size={36} className="hero-icon" />
          <h1>Awards & Achievements</h1>
          <p>Celebrating the milestones of our alumni and faculty</p>
          {canSubmit && (
            <button className="submit-achievement-btn" onClick={() => setShowSubmitModal(true)}>
              <Plus size={16} /> Submit Your Achievement
            </button>
          )}
        </div>
      )}

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="modal-overlay" onClick={() => setShowSubmitModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowSubmitModal(false)}><X size={20} /></button>
            <SubmitAchievementForm onSuccess={handleSubmitSuccess} />
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedAchievement && (
        <AchievementDetailModal
          achievement={selectedAchievement}
          onClose={() => setSelectedAchievement(null)}
        />
      )}

      {/* <FeaturedAchievements /> */}
      <AchievementFilter filters={filters} onChange={handleFilterChange} />

      <div className="achievements-section">
        <div className="section-header">
          <h2>All Achievements</h2>
          <span className="result-count">{total} result{total !== 1 ? "s" : ""}</span>
        </div>

        {loading && (
          <div className="loading-state">
            <Loader2 className="spin" size={32} /><p>Loading achievements…</p>
          </div>
        )}
        {error && (
          <div className="error-state">
            <AlertCircle size={24} /><p>{error}</p>
            <button onClick={fetchAchievements}>Retry</button>
          </div>
        )}
        {!loading && !error && achievements.length === 0 && (
          <div className="empty-state">
            <Trophy size={48} opacity={0.3} />
            <p>No achievements found matching your filters.</p>
          </div>
        )}

        <div className="achievements-grid">
          {(showAll ? achievements : achievements.slice(0, 3)).map((a) => (
            <AchievementCard
              key={a._id}
              achievement={a}
              onClick={setSelectedAchievement}
              authUser={authUser}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {achievements.length > 3 && (
          <button className="view-all-btn" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show less ↑" : `View all ${achievements.length} achievements ↓`}
          </button>
        )}

        {pages > 1 && (
          <div className="pagination">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button key={p} className={p === page ? "active" : ""} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button disabled={page === pages} onClick={() => setPage((p) => p + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
};

AchievementsPage.propTypes = {
  auth: PropTypes.object.isRequired,
  setAlert: PropTypes.func.isRequired,
  embedded: PropTypes.bool,
};
const mapStateToProps = (state) => ({ auth: state.auth });
export default connect(mapStateToProps, { setAlert })(AchievementsPage);