import React from "react";
import PropTypes from "prop-types";
import Spinner from "../layouts/Spinner";
import { connect } from "react-redux";
import {
  blockUser,
  unblockUser,
  makeAdmin,
  removeAdmin,
  followUser,
  unFollowUser,
} from "../../actions/users";

const s = {
  card: {
    background: "linear-gradient(135deg, #0c1f57 0%, #1e3a8a 100%)", // Navy blue gradient
    border: "0.5px solid #1e3a8a",
    borderRadius: "16px",
    padding: "1.5rem",
    display: "flex",
    gap: "1.5rem",
    flexWrap: "wrap",
    alignItems: "flex-start",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
    color: "#fff"
  },
  avatar: {
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "3px solid #60a5fa",
    flexShrink: 0,
    boxShadow: "0 4px 10px rgba(0,0,0,0.2)"
  },
  avatarFallback: {
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    background: "#eff6ff",
    border: "3px solid #60a5fa",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "32px",
    fontWeight: "500",
    color: "#1e3a8a",
    flexShrink: 0,
    boxShadow: "0 4px 10px rgba(0,0,0,0.2)"
  },
  meta: {
    flex: 1,
    minWidth: "180px",
  },
  name: {
    fontSize: "24px",
    fontWeight: "600",
    color: "#ffffff",
  },
  roleTag: {
    display: "inline-block",
    marginTop: "6px",
    fontSize: "12px",
    background: "rgba(255, 255, 255, 0.15)",
    color: "#e0e7ff",
    border: "0.5px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "20px",
    padding: "3px 12px",
    textTransform: "capitalize",
    backdropFilter: "blur(4px)"
  },
  org: {
    fontSize: "14px",
    color: "#cbd5e1",
    marginTop: "8px",
  },
  years: {
    fontSize: "13px",
    color: "#94a3b8",
    marginTop: "4px",
  },
  statsRow: {
    display: "flex",
    gap: "30px",
    marginTop: "16px",
    paddingTop: "12px",
    borderTop: "1px solid rgba(255, 255, 255, 0.1)"
  },
  statNum: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#ffffff",
    display: "block",
  },
  statLabel: {
    fontSize: "12px",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  actionRow: {
    display: "flex",
    gap: "10px",
    marginTop: "16px",
    flexWrap: "wrap",
  },
  btnBlue: {
    background: "#3b82f6",
    border: "none",
    color: "#fff",
    padding: "8px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
  },
  btnOutline: {
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.3)",
    color: "#fff",
    padding: "8px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s"
  },
  btnDanger: {
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    color: "#fca5a5",
    padding: "8px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
};

const ProfileTop = ({
  profile,
  auth,
  blockUser,
  unblockUser,
  makeAdmin,
  removeAdmin,
  followUser,
  unFollowUser,
}) => {
  if (profile === null || auth === null) return <Spinner />;

  const profileImage =
    profile.images && profile.images.length > 0
      ? profile.images[0]
      : profile.avatar || null;

  return (
    <div style={s.card}>
      {profileImage ? (
        <>
          <img 
            src={profileImage.replace('d=mm', 'd=404')} 
            alt="profile" 
            style={s.avatar} 
            onError={(e) => {
              e.target.style.display = 'none';
              if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
            }}
          />
          <div style={{...s.avatarFallback, display: 'none'}}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="50%" height="50%">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
        </>
      ) : (
        <div style={s.avatarFallback}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="50%" height="50%">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
      )}

      <div style={s.meta}>
        <div style={s.name}>{profile.name}</div>

        {profile.role && (
          <span style={s.roleTag}>
            {profile.role === "alumni"
              ? `Alumni${profile.passing_year ? ` · ${profile.passing_year} Passout` : ""}`
              : profile.role === "student"
              ? "Student"
              : profile.role === "faculty"
              ? `Faculty · Dept. of ${(profile.department || "").toUpperCase()}`
              : profile.role}
          </span>
        )}

        {profile.role === "alumni" && profile.designation && (
          <div style={s.org}>
            {profile.designation} @ {profile.organisation}
          </div>
        )}
        {profile.role === "alumni" && profile.location && (
          <div style={s.years}>{profile.location}</div>
        )}
        {profile.role === "faculty" && profile.designation && (
          <div style={s.org}>{profile.designation}</div>
        )}
        {profile.role === "student" && (
          <div style={s.years}>
            {profile.starting_year} – {profile.passing_year}
          </div>
        )}

        <div style={s.statsRow}>
          <div>
            <span style={s.statNum}>{profile.followers.length}</span>
            <span style={s.statLabel}>followers</span>
          </div>
          <div>
            <span style={s.statNum}>{profile.followings.length}</span>
            <span style={s.statLabel}>following</span>
          </div>
        </div>

        <div style={s.actionRow}>
          {auth.authUser && profile._id !== auth.authUser._id && (
            auth.authUser.followings.includes(profile._id) ? (
              <button style={s.btnOutline} onClick={() => unFollowUser(profile._id)}>
                Unfollow
              </button>
            ) : (
              <button style={s.btnBlue} onClick={() => followUser(profile._id)}>
                + Follow
              </button>
            )
          )}

          {auth.authUser &&
            auth.authUser.isAdmin &&
            auth.authUser.adminType === "head" &&
            profile._id !== auth.authUser._id && (
              profile.blocked ? (
                <button style={s.btnOutline} onClick={() => unblockUser(profile._id)}>
                  Unblock
                </button>
              ) : (
                <button style={s.btnDanger} onClick={() => blockUser(profile._id)}>
                  Block
                </button>
              )
            )}

          {auth.authUser &&
            auth.authUser.isAdmin &&
            auth.authUser.adminType === "head" &&
            profile._id !== auth.authUser._id && (
              profile.isAdmin ? (
                <button style={s.btnDanger} onClick={() => removeAdmin(profile._id)}>
                  Remove Admin
                </button>
              ) : (
                <button style={s.btnOutline} onClick={() => makeAdmin(profile._id)}>
                  Make Admin
                </button>
              )
            )}
        </div>
      </div>
    </div>
  );
};

ProfileTop.propTypes = {
  profile: PropTypes.object.isRequired,
  auth: PropTypes.object.isRequired,
  makeAdmin: PropTypes.func.isRequired,
  removeAdmin: PropTypes.func.isRequired,
  blockUser: PropTypes.func.isRequired,
  unblockUser: PropTypes.func.isRequired,
  followUser: PropTypes.func.isRequired,
  unFollowUser: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
});

export default connect(mapStateToProps, {
  makeAdmin,
  removeAdmin,
  blockUser,
  unblockUser,
  followUser,
  unFollowUser,
})(ProfileTop);