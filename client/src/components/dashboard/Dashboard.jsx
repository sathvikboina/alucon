import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import Spinner from "../layouts/Spinner.jsx";
import Experience from "./Experience";
import Education from "./Education.jsx";
import DashboardActions from "./DashboardActions";
import { getCurrentUserProfile, addExperience, addEducation, createProfile } from "../../actions/users";
import { closeSideNav, setAlert } from "../../actions/alert";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import api from "../../utils/api";

const noRedirect = { push: () => {} };

// ── Modal ────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }) => (
  <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(10,30,60,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
    <div style={{ backgroundColor: "#fff", borderRadius: "12px", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", padding: "2rem", boxShadow: "0 8px 32px rgba(26,95,168,0.12)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", borderBottom: "1px solid #e8f0fb", paddingBottom: "1rem" }}>
        <h3 style={{ margin: 0, color: "#0d2e5c", fontSize: "1.1rem", fontWeight: 600 }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "#aaa", lineHeight: 1, padding: "2px 6px", borderRadius: "4px" }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

// ── Form styles ──────────────────────────────────────────────────
const inputStyle = { width: "100%", padding: "9px 12px", border: "1px solid #c7d9ee", borderRadius: "7px", fontSize: "0.92rem", boxSizing: "border-box", fontFamily: "inherit", marginTop: "5px", outline: "none" };
const labelStyle = { fontSize: "0.85rem", color: "#555", display: "block", marginBottom: "14px", fontWeight: 500 };
const submitBtn = { backgroundColor: "#1a5fa8", color: "#fff", border: "none", padding: "10px 28px", borderRadius: "7px", fontSize: "0.92rem", cursor: "pointer", fontFamily: "inherit", fontWeight: 500, marginTop: "4px" };

// ── Section heading ──────────────────────────────────────────────
const SectionHeading = ({ label }) => (
  <p style={{ margin: "0 0 10px", fontSize: "0.72rem", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>{label}</p>
);

// ── Main component ───────────────────────────────────────────────
const Dashboard = ({ closeSideNav, setAlert, getCurrentUserProfile, addExperience, addEducation, createProfile, auth: { authUser, loadingAuth } }) => {
  const [modal, setModal] = useState(null);
  const [expForm, setExpForm] = useState({ title: "", company: "", location: "", from: "", to: "", current: false, description: "" });
  const [eduForm, setEduForm] = useState({ school: "", degree: "", fieldofstudy: "", from: "", to: "", current: false, description: "" });

  // Full profile form — all original EditProfile fields
  const [profileForm, setProfileForm] = useState({
    bio: "", website: "", skills: "", location: "",
    show_city: false,
    status: "", organisation: "", githubusername: "",
    twitter: "", facebook: "", linkedin: "", youtube: "", instagram: "",
    mentor_available: false, mentor_areas: "", mentor_capacity: 3, mentor_mode: "Remote",
    mentee_goals: "", internship_types: "", internship_work_modes: "", internship_locations: "",
  });
  const [image, setImage] = useState("");
  const [showSocial, setShowSocial] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // CV / LinkedIn import (F-56). Text is sent once and never stored.
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importConsent, setImportConsent] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importNotice, setImportNotice] = useState("");
  const [importError, setImportError] = useState("");

  useEffect(() => {
    closeSideNav();
    getCurrentUserProfile();
  }, [closeSideNav, getCurrentUserProfile]);

  useEffect(() => {
    if (authUser) {
      setProfileForm({
        bio: authUser.bio || "",
        website: authUser.website || "",
        skills: authUser.skills ? authUser.skills.join(", ") : "",
        location: authUser.location || "",
        show_city: authUser.show_city === true,
        status: authUser.status || "",
        organisation: authUser.organisation || "",
        githubusername: authUser.githubusername || "",
        twitter: authUser.social?.twitter || "",
        facebook: authUser.social?.facebook || "",
        linkedin: authUser.social?.linkedin || "",
        youtube: authUser.social?.youtube || "",
        instagram: authUser.social?.instagram || "",
        mentor_available:
          authUser.mentorship?.available !== undefined
            ? authUser.mentorship.available
            : false,
        mentor_areas: (authUser.mentorship?.areas || []).join(", "),
        mentor_capacity: authUser.mentorship?.capacity || 3,
        mentor_mode: authUser.mentorship?.mode || "Remote",
        mentee_goals: (authUser.mentee_goals || []).join(", "),
        internship_types: (authUser.internship_preferences?.types || []).join(", "),
        internship_work_modes: (authUser.internship_preferences?.work_modes || []).join(", "),
        internship_locations: (authUser.internship_preferences?.locations || []).join(", "),
      });
    }
  }, [authUser]);

  if (loadingAuth || !authUser) return <Spinner />;

  const closeModal = () => setModal(null);
  const onChange = (field) => (e) =>
    setProfileForm({
      ...profileForm,
      [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    });

  const runProfileImport = async () => {
    setImporting(true);
    setImportError("");
    setImportNotice("");
    try {
      const { data } = await api.post("/api/ai/assist/profile-import", {
        profileText: importText,
        consent: importConsent,
      });
      const fields = data.fields || {};
      setProfileForm((current) => {
        const next = { ...current };
        const setText = (key, value) => {
          if (value) next[key] = value;
        };
        setText("bio", fields.bio);
        setText("location", fields.location);
        setText("organisation", fields.organisation);
        setText("status", fields.status);
        setText("website", fields.website);
        setText("githubusername", fields.githubusername);
        if (fields.skills?.length) next.skills = fields.skills.join(", ");
        if (fields.mentee_goals?.length)
          next.mentee_goals = fields.mentee_goals.join(", ");
        if (fields.internship_types?.length)
          next.internship_types = fields.internship_types.join(", ");
        if (fields.internship_work_modes?.length)
          next.internship_work_modes = fields.internship_work_modes.join(", ");
        if (fields.internship_locations?.length)
          next.internship_locations = fields.internship_locations.join(", ");
        const social = fields.social || {};
        for (const key of ["linkedin", "twitter", "facebook", "youtube", "instagram"]) {
          if (social[key]) next[key] = social[key];
        }
        return next;
      });
      if (Object.keys(fields.social || {}).length) setShowSocial(true);
      setImportNotice(
        `${data.fieldCount} field${data.fieldCount === 1 ? "" : "s"} filled from ${
          data.fallback ? "a fixed template (offline)" : data.model
        }. Review everything and click Save Changes — nothing is saved yet.`
      );
      setImportText("");
      setImportConsent(false);
    } catch (err) {
      setImportError(
        err?.response?.data?.msg || "Could not extract fields from that text."
      );
    } finally {
      setImporting(false);
    }
  };

  const handleAddExperience = (e) => {
    e.preventDefault();
    addExperience(expForm, noRedirect);
    setExpForm({ title: "", company: "", location: "", from: "", to: "", current: false, description: "" });
    closeModal();
  };

  const handleAddEducation = (e) => {
    e.preventDefault();
    addEducation(eduForm, noRedirect);
    setEduForm({ school: "", degree: "", fieldofstudy: "", from: "", to: "", current: false, description: "" });
    closeModal();
  };

  const handleEditProfile = async (e) => {
    e.preventDefault();
    let userData = localStorage.getItem("_user_data");
    userData = JSON.parse(userData);
    const userid = userData._id;

    const payload = {
      ...profileForm,
      userID: userid,
      skills: profileForm.skills.split(",").map((s) => s.trim()).filter(Boolean),
    };

    if (image !== "") {
      try {
        setImageUploading(true);
        const formData = new FormData();
        formData.append("file", image);
        const res = await api.post("/api/upload", formData);
        const url = res.data?.url;
        if (!url) throw new Error("Upload did not return an image URL");
        payload.images = [url];
      } catch (err) {
        // Do not silently save the rest of the form and pretend the photo
        // changed. Tell the member what happened and leave the modal open.
        setAlert(
          err?.response?.data?.msg ||
            "Could not upload your profile photo. Please try again with a smaller image.",
          "danger"
        );
        return;
      } finally {
        setImageUploading(false);
      }
    }

    createProfile(payload, noRedirect, true);
    setImage("");
    closeModal();
  };

  const isAlumni = ["alumni", "faculty"].includes(String(authUser.role).toLowerCase());
  const roleSubtitle = authUser.role === "alumni"
    ? `${authUser.designation} · ${authUser.organisation}, ${authUser.location}`
    : authUser.role === "student"
    ? "Student · IIITA"
    : authUser.role === "faculty"
    ? `${authUser.designation} · Department of ${authUser.department}`
    : "";

  // Initials fallback
  const initials = authUser.name ? authUser.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : "?";

  return (
    <div style={{ backgroundColor: "#fff", minHeight: "100vh", fontFamily: "inherit" }}>

      {/* ── Hero banner ──────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #091830 0%, #132a52 50%, #1d3e75 100%)",
        padding: "2.5rem 2.5rem 3.5rem",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 4px 20px rgba(9, 24, 48, 0.16)",
        position: "relative"
      }}>
        <p style={{ margin: "0 0 1.2rem", color: "#93c5fd", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700 }}>
          My Profile
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
          {authUser.images && authUser.images.length > 0 ? (
            <img alt="Profile" src={authUser.images[0]} style={{ height: "92px", width: "92px", borderRadius: "50%", border: "3px solid #60a5fa", objectFit: "cover", flexShrink: 0, boxShadow: "0 4px 14px rgba(0,0,0,0.25)" }} />
          ) : (
            <div style={{ height: "92px", width: "92px", borderRadius: "50%", border: "3px solid #60a5fa", backgroundColor: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", color: "#fff", fontWeight: 600, flexShrink: 0, boxShadow: "0 4px 14px rgba(0,0,0,0.25)" }}>
              {initials}
            </div>
          )}
          <div>
            <h1 style={{ margin: "0 0 6px", color: "#fff", fontSize: "1.85rem", fontWeight: 700, letterSpacing: "-0.01em" }}>{authUser.name}</h1>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.72)", fontSize: "0.95rem" }}>{roleSubtitle}</p>
            <div style={{ display: "flex", gap: "14px", marginTop: "12px" }}>
              {authUser.social?.instagram && <FontAwesomeIcon icon={["fab", "instagram"]} style={{ fontSize: "17px", color: "rgba(255,255,255,0.65)", cursor: "pointer" }} />}
              {authUser.social?.facebook && <FontAwesomeIcon icon={["fab", "facebook"]} style={{ fontSize: "17px", color: "rgba(255,255,255,0.65)", cursor: "pointer" }} />}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", padding: "2rem", alignItems: "flex-start" }}>

        {/* Left sidebar */}
        <div style={{ flex: "0 0 210px", minWidth: "180px", border: "1px solid #e0ecf8", borderRadius: "10px", padding: "1.25rem", position: "sticky", top: "1rem" }}>
          <DashboardActions
            onEditProfile={() => setModal("editProfile")}
            onAddExperience={() => setModal("addExperience")}
            onAddEducation={() => setModal("addEducation")}
          />
        </div>

        {/* Main panel */}
        <div style={{ flex: 1, minWidth: "280px" }}>

          {/* About */}
          <div style={{ border: "1px solid #e0ecf8", borderRadius: "10px", padding: "1.5rem", marginBottom: "1.5rem" }}>
            <SectionHeading label="About" />
            <p style={{ margin: "0 0 1rem", color: "#444", fontSize: "0.95rem", lineHeight: 1.7 }}>
              {authUser.bio || <span style={{ color: "#bbb" }}>No bio added yet.</span>}
            </p>
            {authUser.skills && authUser.skills.length > 0 && (
              <>
                <SectionHeading label="Skills" />
                <div>
                  {authUser.skills.map((skill, i) => (
                    <span key={i} style={{ display: "inline-block", backgroundColor: "#e8f0fb", color: "#1a5fa8", padding: "5px 13px", borderRadius: "20px", fontSize: "0.83rem", margin: "3px", fontWeight: 500 }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
          {/* Details */}
<div style={{ border: "1px solid #e0ecf8", borderRadius: "10px", padding: "1.5rem", marginBottom: "1.5rem" }}>
  <SectionHeading label="Details" />
  <div>
    {[
      {
        label: "Status",
        value: authUser.status,
        render: (v) => (
          <span style={{ backgroundColor: "#e8f0fb", color: "#1a5fa8", padding: "2px 12px", borderRadius: "20px", fontSize: "0.83rem", fontWeight: 500 }}>
            {v}
          </span>
        ),
      },
      { label: "Organisation", value: authUser.organisation },
      { label: "Location",     value: authUser.location },
      {
        label: "Website",
        value: authUser.website,
        render: (v) => (
          <a href={v} target="_blank" rel="noreferrer" style={{ color: "#1a5fa8", fontSize: "0.9rem", wordBreak: "break-all" }}>
            {v}
          </a>
        ),
      },
      { label: "Github", value: authUser.githubusername },
    ]
      .filter((row) => row.value)
      .map((row, i, arr) => (
        <div
          key={row.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "9px 0",
            borderBottom: i < arr.length - 1 ? "1px solid #f0f5fc" : "none",
          }}
        >
          <span style={{ fontSize: "0.82rem", color: "#999", minWidth: "100px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {row.label}
          </span>
          {row.render ? (
            row.render(row.value)
          ) : (
            <span style={{ fontSize: "0.92rem", color: "#333" }}>{row.value}</span>
          )}
        </div>
      ))}
  </div>
</div>

          {/* Experience */}
          <div style={{ border: "1px solid #e0ecf8", borderRadius: "10px", padding: "1.5rem", marginBottom: "1.5rem" }}>
            <Experience experience={authUser.experience || []} />
          </div>

          {/* Education */}
          <div style={{ border: "1px solid #e0ecf8", borderRadius: "10px", padding: "1.5rem" }}>
            <Education education={authUser.education || []} />
          </div>
        </div>
      </div>

      {/* ── Edit Profile Modal ───────────────────────────────── */}
      {modal === "editProfile" && (
        <Modal title="Edit Profile" onClose={closeModal}>
          <form onSubmit={handleEditProfile}>

            <div style={{ border: "1px solid #dbe6f3", borderRadius: "8px", padding: "12px", marginBottom: "16px", background: "#f8fbff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                <div>
                  <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "#174a80" }}>
                    Import from a CV or LinkedIn
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#666", lineHeight: 1.45 }}>
                    Paste text, extract a few fields, then review and save. Text is sent once and not stored.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setImportOpen(!importOpen);
                    setImportNotice("");
                    setImportError("");
                  }}
                  style={{ flex: "0 0 auto", background: "none", border: "1px solid #c7d9ee", borderRadius: "7px", padding: "7px 14px", color: "#1a5fa8", cursor: "pointer", fontSize: "0.85rem", fontFamily: "inherit" }}
                >
                  {importOpen ? "Close import" : "Import text"}
                </button>
              </div>

              {importOpen && (
                <div style={{ marginTop: "12px" }}>
                  <textarea
                    style={{ ...inputStyle, height: "110px", resize: "vertical" }}
                    placeholder="Paste your CV or LinkedIn profile text here"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    maxLength={12000}
                  />
                  <label style={{ ...labelStyle, display: "flex", alignItems: "flex-start", gap: "8px", marginTop: "10px" }}>
                    <input
                      type="checkbox"
                      checked={importConsent}
                      onChange={(e) => setImportConsent(e.target.checked)}
                      style={{ marginTop: "4px" }}
                    />
                    <span style={{ fontWeight: 400 }}>
                      I want to extract profile fields from this text.
                      <span style={{ display: "block", color: "#999", fontSize: "0.78rem", marginTop: "3px" }}>
                        Extraction fills the form only. Nothing is saved until you click Save Changes.
                      </span>
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={runProfileImport}
                    disabled={importing || !importConsent || importText.trim().length < 80}
                    style={{ ...submitBtn, marginTop: 0, opacity: importing || !importConsent || importText.trim().length < 80 ? 0.6 : 1 }}
                  >
                    {importing ? "Extracting…" : "Extract fields"}
                  </button>
                  {importNotice && (
                    <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#067647" }}>{importNotice}</p>
                  )}
                  {importError && (
                    <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#b42318" }}>{importError}</p>
                  )}
                </div>
              )}
            </div>

            <label style={labelStyle}>
              Status <span style={{ color: "red" }}>*</span>
              <select style={inputStyle} value={profileForm.status} onChange={onChange("status")} required>
                <option value="">-- Select Status --</option>
                <option value="Developer">Developer</option>
                <option value="Junior Developer">Junior Developer</option>
                <option value="Senior Developer">Senior Developer</option>
                <option value="Student">Student</option>
                <option value="Intern">Intern</option>
                <option value="Instructor">Instructor / Teacher</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label style={labelStyle}>
              Organisation
              <input style={inputStyle} type="text" placeholder="Your company or institute" value={profileForm.organisation} onChange={onChange("organisation")} />
            </label>

            <label style={labelStyle}>
              Bio
              <textarea style={{ ...inputStyle, height: "85px", resize: "vertical" }} placeholder="A short bio about yourself" value={profileForm.bio} onChange={onChange("bio")} />
            </label>

            <label style={labelStyle}>
              Portfolio / Website
              <input style={inputStyle} type="text" placeholder="https://example.com" value={profileForm.website} onChange={onChange("website")} />
            </label>

            <label style={labelStyle}>
              Skills <span style={{ color: "red" }}>*</span> <span style={{ color: "#aaa", fontWeight: 400 }}>(comma separated)</span>
              <input style={inputStyle} type="text" placeholder="HTML, CSS, JavaScript" value={profileForm.skills} onChange={onChange("skills")} required />
            </label>

            <div style={{ border: "1px solid #dbe6f3", borderRadius: "8px", padding: "12px", marginBottom: "16px", background: "#f8fbff" }}>
              <p style={{ margin: "0 0 10px", fontSize: "12px", fontWeight: 700, color: "#174a80", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Matching preferences
              </p>
              {isAlumni ? (
                <>
                  <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "8px" }}>
                    <input type="checkbox" checked={profileForm.mentor_available} onChange={onChange("mentor_available")} />
                    Open to mentoring students
                  </label>
                  <label style={labelStyle}>
                    Mentoring areas <span style={{ color: "#aaa", fontWeight: 400 }}>(comma separated)</span>
                    <input style={inputStyle} type="text" placeholder="Career, Research, Higher Studies" value={profileForm.mentor_areas} onChange={onChange("mentor_areas")} />
                  </label>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <label style={{ ...labelStyle, flex: 1 }}>
                      Capacity
                      <input style={inputStyle} type="number" min="1" max="20" value={profileForm.mentor_capacity} onChange={onChange("mentor_capacity")} />
                    </label>
                    <label style={{ ...labelStyle, flex: 1 }}>
                      Mode
                      <select style={inputStyle} value={profileForm.mentor_mode} onChange={onChange("mentor_mode")}>
                        <option>Remote</option>
                        <option>Hybrid</option>
                        <option>In-person</option>
                      </select>
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <label style={labelStyle}>
                    Mentorship goals <span style={{ color: "#aaa", fontWeight: 400 }}>(comma separated)</span>
                    <input style={inputStyle} type="text" placeholder="Career, Placements" value={profileForm.mentee_goals} onChange={onChange("mentee_goals")} />
                  </label>
                  <label style={labelStyle}>
                    Internship types
                    <input style={inputStyle} type="text" placeholder="Internship, Research, Referral" value={profileForm.internship_types} onChange={onChange("internship_types")} />
                  </label>
                  <label style={labelStyle}>
                    Preferred work modes
                    <input style={inputStyle} type="text" placeholder="Remote, Hybrid" value={profileForm.internship_work_modes} onChange={onChange("internship_work_modes")} />
                  </label>
                  <label style={labelStyle}>
                    Preferred locations
                    <input style={inputStyle} type="text" placeholder="Bengaluru, Hyderabad, Remote" value={profileForm.internship_locations} onChange={onChange("internship_locations")} />
                  </label>
                </>
              )}
            </div>

            <label style={labelStyle}>
              Location
              <input style={inputStyle} type="text" placeholder="City, Country" value={profileForm.location} onChange={onChange("location")} />
            </label>

            <label style={{ ...labelStyle, display: "flex", alignItems: "flex-start", gap: "8px" }}>
              <input
                type="checkbox"
                checked={profileForm.show_city}
                onChange={onChange("show_city")}
                style={{ marginTop: "4px" }}
              />
              <span>
                Include my city in BATCH group totals
                <span style={{ display: "block", color: "#999", fontWeight: 400, fontSize: "0.78rem", marginTop: "3px" }}>
                  Off by default. In “Then &amp; Now”, only your city-level count appears — never your name or exact location.
                </span>
              </span>
            </label>

            <label style={labelStyle}>
              Github Username
              <input style={inputStyle} type="text" placeholder="your-github-username" value={profileForm.githubusername} onChange={onChange("githubusername")} />
            </label>

            <label style={labelStyle}>
              Profile Photo
              <input style={{ ...inputStyle, padding: "6px" }} type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} />
            </label>

            {/* Social toggle */}
            <div style={{ borderTop: "1px solid #e8f0fb", margin: "16px 0 14px", paddingTop: "16px" }}>
              <button
                type="button"
                onClick={() => setShowSocial(!showSocial)}
                style={{ background: "none", border: "1px solid #c7d9ee", borderRadius: "7px", padding: "7px 16px", color: "#1a5fa8", cursor: "pointer", fontSize: "0.88rem", fontFamily: "inherit" }}
              >
                {showSocial ? "Hide Social Links" : "Add Social Network Links"}
                <span style={{ marginLeft: "6px", color: "#aaa", fontWeight: 400 }}>— optional</span>
              </button>
            </div>

            {showSocial && (
              <div>
                {["twitter", "facebook", "youtube", "linkedin", "instagram"].map((platform) => (
                  <label key={platform} style={labelStyle}>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <i className={`fab fa-${platform}`} style={{ color: "#1a5fa8", width: "16px" }} />
                      {platform.charAt(0).toUpperCase() + platform.slice(1)} URL
                    </span>
                    <input style={inputStyle} type="text" placeholder={`https://${platform}.com/yourprofile`} value={profileForm[platform]} onChange={onChange(platform)} />
                  </label>
                ))}
              </div>
            )}

            <button type="submit" style={submitBtn} disabled={imageUploading}>
              {imageUploading ? "Uploading..." : "Save Changes"}
            </button>
          </form>
        </Modal>
      )}

      {/* ── Add Experience Modal ─────────────────────────────── */}
      {modal === "addExperience" && (
        <Modal title="Add Experience" onClose={closeModal}>
          <form onSubmit={handleAddExperience}>
            <label style={labelStyle}>Company <span style={{ color: "red" }}>*</span>
              <input style={inputStyle} type="text" value={expForm.company} onChange={(e) => setExpForm({ ...expForm, company: e.target.value })} required />
            </label>
            <label style={labelStyle}>Position / Title <span style={{ color: "red" }}>*</span>
              <input style={inputStyle} type="text" value={expForm.title} onChange={(e) => setExpForm({ ...expForm, title: e.target.value })} required />
            </label>
            <label style={labelStyle}>Location
              <input style={inputStyle} type="text" value={expForm.location} onChange={(e) => setExpForm({ ...expForm, location: e.target.value })} />
            </label>
            <label style={labelStyle}>
              From <span style={{ color: "red" }}>*</span>
              <input
                style={inputStyle}
                type="date"
                value={expForm.from}
                max={expForm.to || new Date().toISOString().split("T")[0]}
                onChange={(e) => setExpForm({ ...expForm, from: e.target.value })}
                required
              />
            </label>
            <label style={labelStyle}>
              To
              <input
                style={{ ...inputStyle, backgroundColor: expForm.current ? "#f4f7fb" : "#fff" }}
                type="date"
                value={expForm.to}
                min={expForm.from}
                max={new Date().toISOString().split("T")[0]}
                disabled={expForm.current}
                onChange={(e) => setExpForm({ ...expForm, to: e.target.value })}
              />
            </label>
            <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "8px" }}>
              <input type="checkbox" checked={expForm.current} onChange={() => setExpForm({ ...expForm, current: !expForm.current, to: "" })} />
              Currently working here
            </label>
            <label style={labelStyle}>Description
              <textarea style={{ ...inputStyle, height: "75px", resize: "vertical" }} value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} />
            </label>
            <button type="submit" style={submitBtn}>Add Experience</button>
          </form>
        </Modal>
      )}

      {/* ── Add Education Modal ──────────────────────────────── */}
      {modal === "addEducation" && (
        <Modal title="Add Education" onClose={closeModal}>
          <form onSubmit={handleAddEducation}>
            <label style={labelStyle}>School / University <span style={{ color: "red" }}>*</span>
              <input style={inputStyle} type="text" value={eduForm.school} onChange={(e) => setEduForm({ ...eduForm, school: e.target.value })} required />
            </label>
            <label style={labelStyle}>Degree <span style={{ color: "red" }}>*</span>
              <input style={inputStyle} type="text" value={eduForm.degree} onChange={(e) => setEduForm({ ...eduForm, degree: e.target.value })} required />
            </label>
            <label style={labelStyle}>Field of Study <span style={{ color: "red" }}>*</span>
              <input style={inputStyle} type="text" value={eduForm.fieldofstudy} onChange={(e) => setEduForm({ ...eduForm, fieldofstudy: e.target.value })} required />
            </label>
            <label style={labelStyle}>
              From <span style={{ color: "red" }}>*</span>
              <input
                style={inputStyle}
                type="date"
                value={eduForm.from}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setEduForm({ ...eduForm, from: e.target.value })}
                required
              />
            </label>
            <label style={labelStyle}>
              To
              <input
                style={{ ...inputStyle, backgroundColor: eduForm.current ? "#f4f7fb" : "#fff" }}
                type="date"
                value={eduForm.to}
                max={new Date().toISOString().split("T")[0]}
                disabled={eduForm.current}
                onChange={(e) => setEduForm({ ...eduForm, to: e.target.value })}
              />
            </label>
            <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "8px" }}>
              <input type="checkbox" checked={eduForm.current} onChange={() => setEduForm({ ...eduForm, current: !eduForm.current, to: "" })} />
              Currently studying here
            </label>
            <label style={labelStyle}>Description
              <textarea style={{ ...inputStyle, height: "75px", resize: "vertical" }} value={eduForm.description} onChange={(e) => setEduForm({ ...eduForm, description: e.target.value })} />
            </label>
            <button type="submit" style={submitBtn}>Add Education</button>
          </form>
        </Modal>
      )}
    </div>
  );
};

Dashboard.propTypes = {
  setAlert: PropTypes.func.isRequired,
  getCurrentUserProfile: PropTypes.func.isRequired,
  addExperience: PropTypes.func.isRequired,
  addEducation: PropTypes.func.isRequired,
  createProfile: PropTypes.func.isRequired,
  auth: PropTypes.object.isRequired,
  closeSideNav: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({ auth: state.auth });

export default connect(mapStateToProps, { getCurrentUserProfile, closeSideNav, setAlert, addExperience, addEducation, createProfile })(Dashboard);