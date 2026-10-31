import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { Modal, Box } from "@mui/material";
import "./UsersByType.css";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getInitials = (name = "") =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

// ─── Inline User Card (uses real fields from UserCard.jsx / UserCardModal.jsx) ─

const UbtUserCard = ({ profile }) => {
  const [imgError, setImgError] = useState(false);

  const avatarSrc =
    profile.images?.length > 0
      ? profile.images[0]
      : profile.avatar?.replace("d=mm", "d=404");

  const showAvatar = avatarSrc && !imgError;

  // Role-specific subtitle line (mirrors UserCardModal.jsx logic)
  const subtitle = (() => {
    if (profile.role === "alumni") {
      const parts = [];
      if (profile.designation && profile.organisation)
        parts.push(`${profile.designation} @ ${profile.organisation}`);
      if (profile.passing_year)
        parts.push(`${profile.passing_year} Passout`);
      return parts.join(" · ");
    }
    if (profile.role === "student") {
      const years =
        profile.starting_year && profile.passing_year
          ? `${profile.starting_year} – ${profile.passing_year}`
          : "";
      return `Student @ IIITA${years ? ` · ${years}` : ""}`;
    }
    if (profile.role === "faculty") {
      const parts = [];
      if (profile.designation) parts.push(profile.designation);
      if (profile.department) parts.push(`Dept. of ${profile.department}`);
      return parts.join(" · ");
    }
    return "";
  })();

  const locationOrYear = (() => {
    if (profile.role === "alumni" && profile.location) return `📍 ${profile.location}`;
    if (profile.role === "student" && profile.passing_year) return `🎓 Expected ${profile.passing_year}`;
    return null;
  })();

  const badgeClass = profile.role?.toLowerCase() || "student";

  return (
    <div className="ubt-card">
      {/* Avatar */}
      {showAvatar ? (
        <img
          className="ubt-avatar"
          src={avatarSrc}
          alt={profile.name}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="ubt-avatar-fallback">{getInitials(profile.name)}</div>
      )}

      {/* Info */}
      <div className="ubt-info">
        <Link to={`/profile/${profile._id}`} className="ubt-name">
          {profile.name || "—"}
        </Link>

        {subtitle && <p className="ubt-sub">{subtitle}</p>}

        <div className="ubt-meta">
          {profile.role && (
            <span className={`ubt-badge ${badgeClass}`}>
              {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
            </span>
          )}
          {profile.isAdmin && (
            <span className="ubt-badge admin">
              {profile.adminType === "head" ? "Head Admin" : "Sub Admin"}
            </span>
          )}
          {locationOrYear && (
            <span className="ubt-detail">{locationOrYear}</span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const UsersByType = ({ users = [], label }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.designation, u.organisation, u.department, u.location]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(q))
    );
  }, [users, query]);

  const handleClose = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      {/* Clickable stat pill */}
      <li className="user-type-count" onClick={() => setOpen(true)}>
        <span>{label}</span>
        <span className="count">{users?.length || 0}</span>
      </li>

      {/* Modal */}
      <Modal open={open} onClose={handleClose}>
        <Box className="modal-center">
          <div className="members-modal" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="modal-header">
              <div className="modal-header-left">
                <h3>{label} Members</h3>
                <span className="modal-header-count">
                  {filtered.length} of {users.length} member{users.length !== 1 ? "s" : ""}
                </span>
              </div>
              <button className="modal-close-btn" onClick={handleClose}>✕</button>
            </div>

            {/* Search */}
            <div className="modal-search-wrap">
              <div className="modal-search-inner">
                <span className="modal-search-icon">🔍</span>
                <input
                  className="modal-search-input"
                  type="text"
                  placeholder={`Search ${label.toLowerCase()} by name, role, department…`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
                {query && (
                  <span
                    style={{ cursor: "pointer", color: "#94a3b8", fontSize: 14 }}
                    onClick={() => setQuery("")}
                  >
                    ✕
                  </span>
                )}
              </div>
            </div>

            {/* List */}
            <div className="modal-content">
              {filtered.length > 0 ? (
                filtered.map((user) => (
                  <UbtUserCard key={user._id} profile={user} />
                ))
              ) : (
                <p className="no-users">
                  {query ? `No results for "${query}"` : "No users found"}
                </p>
              )}
            </div>

          </div>
        </Box>
      </Modal>
    </>
  );
};

UsersByType.propTypes = {
  users: PropTypes.array,
  label: PropTypes.string.isRequired,
};

export default UsersByType;