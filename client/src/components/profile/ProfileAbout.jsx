import React, { Fragment } from "react";
import PropTypes from "prop-types";

const s = {
  card: {
    background: "#fff",
    border: "0.5px solid #B5D4F4",
    borderRadius: "12px",
    padding: "1.25rem",
  },
  sectionTitle: {
    fontSize: "15px",
    fontWeight: "500",
    color: "#185FA5",
    marginBottom: "12px",
    borderBottom: "1px solid #E6F1FB",
    paddingBottom: "8px",
  },
  bio: {
    fontSize: "14px",
    color: "#444",
    lineHeight: "1.7",
    marginBottom: "10px",
  },
  metaRow: {
    display: "flex",
    gap: "8px",
    fontSize: "13px",
    color: "#555",
    marginTop: "6px",
  },
  metaLabel: {
    color: "#999",
    minWidth: "80px",
  },
  metaValue: {
    color: "#185FA5",
  },
  skillsLabel: {
    fontSize: "13px",
    color: "#999",
    marginTop: "14px",
    marginBottom: "8px",
  },
  skillsWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  },
  chip: {
    background: "#E6F1FB",
    color: "#185FA5",
    border: "0.5px solid #B5D4F4",
    borderRadius: "20px",
    fontSize: "12px",
    padding: "3px 12px",
  },
  empty: {
    fontSize: "13px",
    color: "#aaa",
  },
};

const ProfileAbout = ({ profile }) => {
  return (
    <div style={s.card}>
      <h2 style={s.sectionTitle}>About</h2>

      {profile.bio ? (
        <Fragment>
          <p style={s.bio}>{profile.bio}</p>

          {profile.website && (
            <div style={s.metaRow}>
              <span style={s.metaLabel}>Website</span>
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                style={s.metaValue}
              >
                {profile.website}
              </a>
            </div>
          )}

          {profile.githubusername && (
            <div style={s.metaRow}>
              <span style={s.metaLabel}>GitHub</span>
              <a
                href={`https://github.com/${profile.githubusername}`}
                target="_blank"
                rel="noopener noreferrer"
                style={s.metaValue}
              >
                {profile.githubusername}
              </a>
            </div>
          )}
        </Fragment>
      ) : (
        <p style={s.empty}>No bio provided.</p>
      )}

      {profile.skills && profile.skills.length > 0 && (
        <Fragment>
          <p style={s.skillsLabel}>Skills</p>
          <div style={s.skillsWrap}>
            {profile.skills.map((skill, index) => (
              <span key={index} style={s.chip}>
                {skill}
              </span>
            ))}
          </div>
        </Fragment>
      )}
    </div>
  );
};

ProfileAbout.propTypes = {
  profile: PropTypes.object.isRequired,
};

export default ProfileAbout;