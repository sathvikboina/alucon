import React, { useState, useEffect, useRef } from "react";
import { Upload, CheckCircle, AlertCircle, Loader2, Image as ImageIcon, X, Trophy } from "lucide-react";
import api from "../../utils/api";
import uploadImage from "../../utils/uploadImage";

const parseUserData = () => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("_user_data");
    if (!raw || raw === "none") return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const storedUser = parseUserData();

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "",
  awardingBody: "",
  achievementDate: "",
  imageUrl: "",
  proofDocumentUrl: "",
  tags: "",
  email: storedUser.email || "",
  recipientName: storedUser.name || "",
  courseName: storedUser.program || "",
  passoutYear: storedUser.passing_year || "",
  currentDesignation: storedUser.designation || "",
  currentOrganization: [storedUser.organisation, storedUser.location].filter(Boolean).join(", ") || "",
  higherQualification: "",
  contactPhone: "",
  awardPeriod: "",
  rollNumber: "",
};

export default function SubmitAchievementForm({ onSuccess, editData }) {
  const [form, setForm]             = useState(editData || EMPTY_FORM);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [success, setSuccess]       = useState(false);
  const [showPopup, setShowPopup]   = useState(false);
  const pendingSuccessRef           = React.useRef(false);
  const [error, setError]           = useState(null);
  const [imagePreview, setImagePreview] = useState(editData?.imageUrl || "");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const isEditing = Boolean(editData?._id);

  useEffect(() => {
    api.get("/api/achievement-categories")
      .then(({ data }) => setCategories(data.categories))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (editData) {
      setForm({
        ...editData,
        achievementDate: editData.achievementDate ? editData.achievementDate.split("T")[0] : "",
        tags: (editData.tags || []).join(", "),
        category: editData.category?._id || editData.category || "",
        email: editData.email || "",
        recipientName: editData.recipientName || "",
        courseName: editData.courseName || "",
        passoutYear: editData.passoutYear || "",
        currentDesignation: editData.currentDesignation || "",
        currentOrganization: editData.currentOrganization || "",
        higherQualification: editData.higherQualification || "",
        contactPhone: editData.contactPhone || "",
        awardPeriod: editData.awardPeriod || "",
        rollNumber: editData.rollNumber || "",
      });
      setImagePreview(editData.imageUrl || "");
    }
  }, [editData]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10MB.");
      return;
    }

    setError(null);
    setUploadingImage(true);

    // Show local preview immediately while uploading
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);

    try {
      // Upload to Cloudinary via existing /api/upload pipeline
      const url = await uploadImage(file);
      setImagePreview(url);
      setForm((prev) => ({ ...prev, imageUrl: url }));
    } catch (err) {
      setError("Image upload failed. Please try again.");
      setImagePreview("");
      setForm((prev) => ({ ...prev, imageUrl: "" }));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageDrop = (e) => {
    e.preventDefault();
    handleImageFile(e.dataTransfer.files[0]);
  };

  const closePopup = () => {
    setShowPopup(false);
    if (pendingSuccessRef.current) {
      pendingSuccessRef.current = false;
      if (onSuccess) onSuccess(false);
    }
  };

  const clearImage = () => {
    setImagePreview("");
    setForm((prev) => ({ ...prev, imageUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (uploadingImage) {
      setError("Please wait for the image to finish uploading.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(false);

    const payload = {
      ...form,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    };

    try {
      if (isEditing) {
        await api.put(`/api/achievements/${editData._id}`, payload);
      } else {
        await api.post("/api/achievements", payload);
      }
      setSuccess(true);
      if (!isEditing) {
        setShowPopup(true);
        pendingSuccessRef.current = true;
        setForm(EMPTY_FORM);
        setImagePreview("");
      }
      if (isEditing && onSuccess) onSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Submission failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="submit-achievement-form">
      <h2>{isEditing ? "Edit Achievement" : "Submit an Achievement"}</h2>

      {!isEditing && (
        <div className="approval-notice">
          <CheckCircle size={15} />
          <span>Submissions go through an admin review before appearing publicly.</span>
        </div>
      )}
      {isEditing && (
        <p className="form-subtitle">Update your achievement details. It will be re-reviewed by an admin.</p>
      )}

      {success && (
        <div className="form-alert success">
          <CheckCircle size={18} />
          {isEditing
            ? "Achievement updated and sent for review."
            : "Achievement submitted! It will appear after admin approval. ✓"}
        </div>
      )}
      {error && (
        <div className="form-alert error">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>

        {/* Image Upload */}
        <div className="form-group">
          <label>Achievement Image</label>
          {!imagePreview ? (
            <div
              className="image-drop-zone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleImageDrop}
            >
              {uploadingImage ? (
                <>
                  <Loader2 size={24} className="spin" />
                  <span className="drop-label">Uploading to cloud…</span>
                </>
              ) : (
                <>
                  <ImageIcon size={28} className="drop-icon" />
                  <span className="drop-label">Click or drag & drop an image</span>
                  <span className="drop-sub">PNG, JPG, WEBP · max 10MB</span>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleImageFile(e.target.files[0])}
              />
            </div>
          ) : (
            <div className="image-preview-wrap">
              <div className="image-preview-container">
                <img src={imagePreview} alt="Preview" className="image-preview" />
                {uploadingImage && (
                  <div className="image-uploading-overlay">
                    <Loader2 size={24} className="spin" />
                    <span>Uploading…</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="image-remove-btn"
                onClick={clearImage}
                disabled={uploadingImage}
              >
                <X size={16} /> Remove
              </button>
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="title">Achievement Title *</label>
          <input
            id="title" name="title" required
            value={form.title} onChange={handleChange}
            placeholder="e.g. Best Paper Award at ICML 2024"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description" name="description" required rows={4}
            value={form.description} onChange={handleChange}
            placeholder="Describe your achievement in detail…"
          />
        </div>

        <div className="section-heading">
          <h3>Alumni details</h3>
          <p>Please provide your alumni record information for IIIT-A institutional records.</p>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              id="email" name="email" type="email" required
              value={form.email} onChange={handleChange}
              placeholder="your.email@example.com"
            />
          </div>
          <div className="form-group">
            <label htmlFor="recipientName">Full Name *</label>
            <input
              id="recipientName" name="recipientName" required
              value={form.recipientName} onChange={handleChange}
              placeholder="Your full name"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="courseName">Course Name *</label>
            <input
              id="courseName" name="courseName" required
              value={form.courseName} onChange={handleChange}
              placeholder="Course completed from IIITA"
            />
          </div>
          <div className="form-group">
            <label htmlFor="passoutYear">Passout Year *</label>
            <input
              id="passoutYear" name="passoutYear" type="text" required
              value={form.passoutYear} onChange={handleChange}
              placeholder="e.g. 2020"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="currentDesignation">Current Designation</label>
            <input
              id="currentDesignation" name="currentDesignation"
              value={form.currentDesignation} onChange={handleChange}
              placeholder="e.g. Senior Engineer"
            />
          </div>
          <div className="form-group">
            <label htmlFor="currentOrganization">Current Organization (City & Country)</label>
            <input
              id="currentOrganization" name="currentOrganization"
              value={form.currentOrganization} onChange={handleChange}
              placeholder="e.g. Google, Mountain View, USA"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="higherQualification">Higher Qualification</label>
            <input
              id="higherQualification" name="higherQualification"
              value={form.higherQualification} onChange={handleChange}
              placeholder="Higher qualification after IIITA (if any)"
            />
          </div>
          <div className="form-group">
            <label htmlFor="contactPhone">Contact / Phone Number</label>
            <input
              id="contactPhone" name="contactPhone" type="tel"
              value={form.contactPhone} onChange={handleChange}
              placeholder="Optional but recommended"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="awardPeriod">Award / Recognition Period</label>
            <input
              id="awardPeriod" name="awardPeriod"
              value={form.awardPeriod} onChange={handleChange}
              placeholder="e.g. 2023-24"
            />
          </div>
          <div className="form-group">
            <label htmlFor="rollNumber">IIIT-A Roll Number</label>
            <input
              id="rollNumber" name="rollNumber"
              value={form.rollNumber} onChange={handleChange}
              placeholder="Your IIIT-A roll number"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category">Category *</label>
            <select id="category" name="category" required value={form.category} onChange={handleChange}>
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="achievementDate">Date Received *</label>
            <input
              id="achievementDate" name="achievementDate" type="date" required
              value={form.achievementDate} onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="awardingBody">Awarding Organization</label>
          <input
            id="awardingBody" name="awardingBody"
            value={form.awardingBody} onChange={handleChange}
            placeholder="e.g. IEEE, Government of India, Forbes"
          />
        </div>

        <div className="form-group">
          <label htmlFor="proofDocumentUrl">
            <Upload size={14} /> Proof Document URL
          </label>
          <input
            id="proofDocumentUrl" name="proofDocumentUrl"
            value={form.proofDocumentUrl} onChange={handleChange}
            placeholder="https://drive.google.com/…"
          />
        </div>

        <div className="form-group">
          <label htmlFor="tags">Tags (comma-separated)</label>
          <input
            id="tags" name="tags"
            value={form.tags} onChange={handleChange}
            placeholder="e.g. AI, Machine Learning, Best Paper"
          />
        </div>

        <button type="submit" className="submit-btn" disabled={loading || uploadingImage}>
          {loading ? (
            <><Loader2 size={16} className="spin" /> Submitting…</>
          ) : uploadingImage ? (
            <><Loader2 size={16} className="spin" /> Uploading image…</>
          ) : isEditing ? "Update Achievement" : "Submit for Review"}
        </button>

      </form>

      {/* ── Success Popup Modal ── */}
      {showPopup && (
        <div className="achievement-popup-overlay" onClick={closePopup}>
          <div className="achievement-popup" onClick={(e) => e.stopPropagation()}>
            <button
              className="achievement-popup-close"
              onClick={closePopup}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="achievement-popup-icon">
              <Trophy size={36} />
            </div>

            <h3 className="achievement-popup-title">Achievement Submitted!</h3>
            <p className="achievement-popup-message">
              Your achievement has been sent for admin review. It will appear publicly once approved.
            </p>

            <button className="achievement-popup-btn" onClick={closePopup}>
              Got it!
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes popupFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes popupSlideUp {
          from { opacity: 0; transform: translateY(28px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes trophyBounce {
          0%,100% { transform: translateY(0)   rotate(-6deg); }
          50%      { transform: translateY(-8px) rotate( 6deg); }
        }

        .achievement-popup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: popupFadeIn 0.2s ease;
        }

        .achievement-popup {
          position: relative;
          background: #fff;
          border-radius: 20px;
          padding: 40px 36px 32px;
          max-width: 380px;
          width: 90%;
          text-align: center;
          box-shadow: 0 24px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08);
          animation: popupSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .achievement-popup-close {
          position: absolute;
          top: 14px;
          right: 14px;
          background: #f3f4f6;
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #6b7280;
          transition: background 0.15s, color 0.15s;
        }
        .achievement-popup-close:hover {
          background: #e5e7eb;
          color: #111827;
        }

        .achievement-popup-icon {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          color: #d97706;
          animation: trophyBounce 1.4s ease-in-out infinite;
          box-shadow: 0 0 0 8px rgba(251,191,36,0.12), 0 0 0 16px rgba(251,191,36,0.06);
        }

        .achievement-popup-title {
          font-size: 1.35rem;
          font-weight: 700;
          color: #111827;
          margin: 0 0 10px;
          letter-spacing: -0.3px;
        }

        .achievement-popup-message {
          font-size: 0.92rem;
          color: #6b7280;
          line-height: 1.6;
          margin: 0 0 28px;
        }

        .achievement-popup-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 11px 32px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
          box-shadow: 0 4px 14px rgba(16,185,129,0.35);
        }
        .achievement-popup-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(16,185,129,0.4);
        }
        .achievement-popup-btn:active {
          transform: translateY(0);
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}