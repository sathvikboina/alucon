import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle,
  XCircle,
  Download,
  Star,
  StarOff,
  Loader2,
  ChevronDown,
  Filter,
  Plus,
  Trash2,
  Tag,
  Edit2,
  ExternalLink,
  ImageOff,
} from "lucide-react";
import api from "../../utils/api";
import { connect } from "react-redux";

const AdminAchievements = ({ auth }) => {
  const currentUser = auth?.authUser;
  const isHeadAdmin = currentUser?.isAdmin && currentUser?.adminType === "head";

  const [tab, setTab] = useState("pending");
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [previewImg, setPreviewImg] = useState(null); // lightbox
  const [detailsOpen, setDetailsOpen] = useState({});

  // Category state
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", color: "#6366f1", description: "", icon: "trophy" });
  const [catFormLoading, setCatFormLoading] = useState(false);
  const [catError, setCatError] = useState(null);
  const [catSuccess, setCatSuccess] = useState(false);
  const [editingCat, setEditingCat] = useState(null);

  // Download filters
  const [dlStatus, setDlStatus] = useState("");
  const [dlType, setDlType] = useState("");
  const [dlFormat, setDlFormat] = useState("csv");
  const [downloading, setDownloading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "pending") {
        const { data } = await api.get("/api/achievements/pending");
        setAchievements(data.achievements);
      } else if (tab === "all") {
        const { data } = await api.get("/api/achievements?limit=50");
        setAchievements(data.achievements);
      }
    } catch {
      setError("Failed to load achievements.");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    if (tab !== "categories") fetchData();
  }, [fetchData, tab]);

  const fetchCategories = useCallback(async () => {
    setCatLoading(true);
    try {
      const { data } = await api.get("/api/achievement-categories");
      setCategories(data.categories);
    } catch {
      setCatError("Failed to load categories.");
    } finally {
      setCatLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "categories") fetchCategories();
  }, [tab, fetchCategories]);

  const handleApprove = async (id) => {
    setActionLoading((a) => ({ ...a, [id]: "approve" }));
    try {
      await api.patch(`/api/achievements/${id}/approve`);
      setAchievements((prev) =>
        prev.map((a) => (a._id === id ? { ...a, status: "approved" } : a))
      );
    } finally {
      setActionLoading((a) => ({ ...a, [id]: null }));
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt("Reason for rejection (optional):");
    setActionLoading((a) => ({ ...a, [id]: "reject" }));
    try {
      await api.patch(`/api/achievements/${id}/reject`, { reason });
      setAchievements((prev) => prev.filter((a) => a._id !== id));
    } finally {
      setActionLoading((a) => ({ ...a, [id]: null }));
    }
  };

  const handleFeature = async (achievement) => {
    if (achievement.isFeatured) {
      const { data } = await api.get("/featured-achievements");
      const record = data.featured.find((f) => f.achievement._id === achievement._id);
      if (record) await api.delete(`/api/featured-achievements/${record._id}`);
    } else {
      await api.post("/api/featured-achievements", { achievementId: achievement._id });
    }
    fetchData();
  };

  const toggleDetails = (id) => {
    setDetailsOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCatSubmit = async (e) => {
    e.preventDefault();
    setCatFormLoading(true);
    setCatError(null);
    setCatSuccess(false);
    try {
      if (editingCat) {
        await api.put(`/api/achievement-categories/${editingCat._id}`, catForm);
      } else {
        await api.post("/api/achievement-categories", catForm);
      }
      setCatSuccess(true);
      setCatForm({ name: "", color: "#6366f1", description: "", icon: "trophy" });
      setEditingCat(null);
      fetchCategories();
    } catch (err) {
      setCatError(err.response?.data?.message || "Failed to save category.");
    } finally {
      setCatFormLoading(false);
    }
  };

  const handleEditCat = (cat) => {
    setEditingCat(cat);
    setCatForm({ name: cat.name, color: cat.color || "#6366f1", description: cat.description || "", icon: cat.icon || "trophy" });
    setCatSuccess(false);
    setCatError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteCat = async (id) => {
    if (!window.confirm("Deactivate this category?")) return;
    try {
      await api.delete(`/api/achievement-categories/${id}`);
      fetchCategories();
    } catch {
      alert("Failed to delete category.");
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams({
        format: dlFormat,
        ...(dlStatus && { status: dlStatus }),
        ...(dlType && { recipientType: dlType }),
      });
      const response = await api.get(`/api/achievements/download?${params}`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `achievements.${dlFormat}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="admin-achievements">
      {/* ── Header — no h1 title ── */}
      <div className="admin-header">
        {isHeadAdmin && (
          <div className="download-panel">
            <h3><Download size={16} /> Download All Achievements</h3>
            <div className="download-controls">
              <div className="dl-filter">
                <Filter size={13} />
                <select value={dlStatus} onChange={(e) => setDlStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="dl-filter">
                <select value={dlType} onChange={(e) => setDlType(e.target.value)}>
                  <option value="">Alumni & Faculty</option>
                  <option value="alumni">Alumni Only</option>
                  <option value="faculty">Faculty Only</option>
                </select>
              </div>
              <div className="dl-filter">
                <ChevronDown size={13} />
                <select value={dlFormat} onChange={(e) => setDlFormat(e.target.value)}>
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              <div className="dl-action">
                <button className="ach-download-btn" onClick={handleDownload} disabled={downloading}>
                  {downloading ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
                  {downloading ? "Preparing…" : `Download ${dlFormat.toUpperCase()}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button className={tab === "pending" ? "active" : ""} onClick={() => setTab("pending")}>Pending Approval</button>
        <button className={tab === "all" ? "active" : ""} onClick={() => setTab("all")}>All Approved</button>
        <button className={tab === "categories" ? "active" : ""} onClick={() => setTab("categories")}>
          <Tag size={14} /> Manage Categories
        </button>
      </div>

      {/* ── CATEGORIES TAB ── */}
      {tab === "categories" && (
        <div className="categories-tab">
          <div className="cat-form-card">
            <h3>
              {editingCat ? <><Edit2 size={16} /> Edit Category</> : <><Plus size={16} /> Add New Category</>}
            </h3>
            {catSuccess && (
              <div className="form-alert success"><CheckCircle size={16} />Category {editingCat ? "updated" : "created"} successfully!</div>
            )}
            {catError && (
              <div className="form-alert error"><XCircle size={16} /> {catError}</div>
            )}
            <form onSubmit={handleCatSubmit} className="cat-form">
              <div className="cat-form-row">
                <div className="form-group">
                  <label>Category Name *</label>
                  <input required value={catForm.name} onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Research, Industry, Entrepreneurship" />
                </div>
                <div className="form-group">
                  <label>Color</label>
                  <div className="color-input-row">
                    <input type="color" value={catForm.color} onChange={(e) => setCatForm((f) => ({ ...f, color: e.target.value }))} className="color-picker" />
                    <input type="text" value={catForm.color} onChange={(e) => setCatForm((f) => ({ ...f, color: e.target.value }))} placeholder="#6366f1" className="color-text" />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input value={catForm.description} onChange={(e) => setCatForm((f) => ({ ...f, description: e.target.value }))} placeholder="Short description of this category" />
              </div>
              <div className="cat-form-actions">
                <button type="submit" className="submit-btn" disabled={catFormLoading}>
                  {catFormLoading ? <Loader2 size={15} className="spin" /> : editingCat ? <Edit2 size={15} /> : <Plus size={15} />}
                  {catFormLoading ? "Saving…" : editingCat ? "Update Category" : "Add Category"}
                </button>
                {editingCat && (
                  <button type="button" className="cancel-btn" onClick={() => { setEditingCat(null); setCatForm({ name: "", color: "#6366f1", description: "", icon: "trophy" }); setCatSuccess(false); setCatError(null); }}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="cat-list-card">
            <h3>Existing Categories</h3>
            {catLoading && <div className="loading-state"><Loader2 className="spin" size={24} /></div>}
            {!catLoading && categories.length === 0 && <p className="empty-text">No categories yet. Add one above!</p>}
            <div className="cat-grid">
              {categories.map((cat) => (
                <div key={cat._id} className="cat-item">
                  <div className="cat-color-dot" style={{ background: cat.color }} />
                  <div className="cat-info">
                    <span className="cat-name">{cat.name}</span>
                    {cat.description && <span className="cat-desc">{cat.description}</span>}
                  </div>
                  <div className="cat-actions">
                    <button className="action-btn feature" title="Edit" onClick={() => handleEditCat(cat)}><Edit2 size={14} /></button>
                    <button className="action-btn reject" title="Deactivate" onClick={() => handleDeleteCat(cat._id)}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ACHIEVEMENTS TABS ── */}
      {tab !== "categories" && (
        <>
          {loading && <div className="loading-state"><Loader2 className="spin" size={28} /></div>}
          {error && <p className="error-text">{error}</p>}
          {!loading && achievements.length === 0 && (
            <p className="empty-text">
              {tab === "pending" ? "No pending achievements. You're all caught up! ✓" : "No achievements found."}
            </p>
          )}
          {!loading && achievements.length > 0 && (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Title</th>
                    <th>Recipient</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th>Proof</th>
                    <th>Status</th>
                    <th>Details</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
{achievements.map((a) => (
  <React.Fragment key={a._id}>

    <tr>
      <td className="td-image">
        {a.imageUrl ? (
          <img
            src={a.imageUrl}
            alt={a.title}
            className="admin-achievement-thumb"
            onClick={() => setPreviewImg(a.imageUrl)}
            title="Click to enlarge"
          />
        ) : (
          <div className="admin-achievement-no-img">
            <ImageOff size={16} />
          </div>
        )}
      </td>

      <td className="td-title">{a.title}</td>
      <td>{a.recipientName}</td>

      <td>
        <span className={`badge ${a.recipientType}`}>
          {a.recipientType}
        </span>
      </td>

      <td>{a.category?.name || "—"}</td>

      <td>
        {a.achievementDate
          ? new Date(a.achievementDate).toLocaleDateString("en-IN")
          : "—"}
      </td>

      <td className="td-proof">
        {a.proofDocumentUrl ? (
          <a
            href={a.proofDocumentUrl}
            target="_blank"
            rel="noreferrer"
            className="proof-doc-link"
          >
            <ExternalLink size={14} /> View
          </a>
        ) : (
          <span>—</span>
        )}
      </td>

      <td>
        <span className={`status-badge ${a.status}`}>
          {a.status}
        </span>
      </td>

      <td>
        <button
          className="action-btn details"
          onClick={() => toggleDetails(a._id)}
        >
          {detailsOpen[a._id] ? "Hide" : "View"}
        </button>
      </td>

      <td className="td-actions">
        {tab === "pending" && (
          <>
            <button
              className="action-btn approve"
              onClick={() => handleApprove(a._id)}
              disabled={actionLoading[a._id]}
            >
              {actionLoading[a._id] === "approve"
                ? <Loader2 size={14} className="spin" />
                : <CheckCircle size={16} />}
            </button>

            <button
              className="action-btn reject"
              onClick={() => handleReject(a._id)}
              disabled={actionLoading[a._id]}
            >
              {actionLoading[a._id] === "reject"
                ? <Loader2 size={14} className="spin" />
                : <XCircle size={16} />}
            </button>
          </>
        )}

        {tab === "all" && (
          <button
            className={`action-btn feature ${a.isFeatured ? "unfeature" : ""}`}
            onClick={() => handleFeature(a)}
          >
            {a.isFeatured
              ? <StarOff size={16} />
              : <Star size={16} />}
          </button>
        )}
      </td>
    </tr>

    {detailsOpen[a._id] && (
      <tr className="details-row">
        <td colSpan="10">
          <div className="detail-grid">
            <div><strong>Email:</strong> {a.email || "—"}</div>
            <div><strong>Course Name:</strong> {a.courseName || "—"}</div>
            <div><strong>Passout Year:</strong> {a.passoutYear || "—"}</div>
            <div><strong>Current Designation:</strong> {a.currentDesignation || "—"}</div>
            <div><strong>Current Organization:</strong> {a.currentOrganization || "—"}</div>
            <div><strong>Higher Qualification:</strong> {a.higherQualification || "—"}</div>
            <div><strong>Contact Phone:</strong> {a.contactPhone || "—"}</div>
            <div><strong>Award Period:</strong> {a.awardPeriod || "—"}</div>
            <div><strong>IIIT-A Roll Number:</strong> {a.rollNumber || "—"}</div>
            <div className="detail-full">
              <strong>Description:</strong> {a.description || "—"}
            </div>
          </div>
        </td>
      </tr>
    )}

  </React.Fragment>
))}
</tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Image Lightbox ── */}
      {previewImg && (
        <div className="img-lightbox-overlay" onClick={() => setPreviewImg(null)}>
          <div className="img-lightbox-box" onClick={(e) => e.stopPropagation()}>
            <button className="img-lightbox-close" onClick={() => setPreviewImg(null)}>✕</button>
            <img src={previewImg} alt="Achievement" className="img-lightbox-img" />
          </div>
        </div>
      )}
    </div>
  );
};

const mapStateToProps = (state) => ({ auth: state.auth });
export default connect(mapStateToProps)(AdminAchievements);