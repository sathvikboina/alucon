import React from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import {
  makeAdmin,
  removeAdmin,
  blockUser,
  unblockUser,
} from "../../actions/users";
import "./UserCard.css";
import { connect } from "react-redux";

const UserCard = ({
  auth: { authUser, loadingAuth },
  profile,
  makeAdmin,
  removeAdmin,
  blockUser,
  unblockUser,
}) => {
  return (
    <div className="profile-card grid-item">
      <div className="profile-header">
        <div className="body">
          <div className="row">
            
            {/* LEFT: IMAGE */}
            <div className="col-lg-4 col-md-4 col-12 profile-left">
              <div className="profile-image">
                {profile.images && profile.images.length > 0 ? (
                  <img src={profile.images[0]} alt="uploaded" />
                ) : (
                  <>
                    {profile.avatar && (
                      <img 
                        src={profile.avatar.replace('d=mm', 'd=404')} 
                        alt="avatar" 
                        onError={(e) => {
                          e.target.style.display = 'none';
                          if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    )}
                    <div style={{ display: profile.avatar ? 'none' : 'flex', width: "52px", height: "52px", borderRadius: "50%", background: "#eff6ff", alignItems: "center", justifyContent: "center", color: "#60a5fa", border: "1px solid #d8dde6" }}>
                      <svg viewBox="0 0 24 24" fill="currentColor" width="60%" height="60%">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                  </>
                )}
              </div>

              {profile.isAdmin && (
                <span className="profile-tag">
                  {profile.adminType === "head"
                    ? "Head"
                    : profile.role}{" "}
                  Admin
                </span>
              )}
            </div>

            {/* RIGHT: DETAILS */}
            <div className="col-lg-8 col-md-8 col-12 profile-right">
              <h4>
                <Link to={`/profile/${profile._id}`}>
                  <strong>{profile.name}</strong>
                </Link>
              </h4>

              {/* Alumni */}
              {profile.role === "alumni" && (
                <>
                  <span>
                    {profile.designation} @ {profile.organisation}
                  </span>
                  <p>{profile.location}</p>
                  <p>
                    Alumni @ IIITA ({profile.passing_year} Passout)
                  </p>
                </>
              )}

              {/* Student */}
              {profile.role === "student" && (
                <>
                  <span>Student @ IIITA</span>
                  <p>
                    {profile.starting_year} - {profile.passing_year}
                  </p>
                </>
              )}

              {/* Faculty */}
              {profile.role === "faculty" && (
                <>
                  <p>{profile.designation}</p>
                  <p>
                    Department of{" "}
                    <span className="department">
                      {profile.department}
                    </span>
                  </p>
                </>
              )}

              {/* ACTION BUTTONS */}
              <div className="profile-actions">
                {!loadingAuth &&
                  authUser.isAdmin &&
                  authUser.adminType === "head" &&
                  !profile.blocked &&
                  profile.adminType !== "head" && (
                    <button
                      className="btn btn-danger"
                      onClick={() => blockUser(profile._id)}
                    >
                      Block User
                    </button>
                  )}

                {!loadingAuth &&
                  authUser.isAdmin &&
                  authUser.adminType === "head" &&
                  profile.blocked && (
                    <button
                      className="btn btn-danger"
                      onClick={() => unblockUser(profile._id)}
                    >
                      Unblock User
                    </button>
                  )}

                {!profile.isAdmin &&
                  !loadingAuth &&
                  authUser.isAdmin &&
                  authUser.adminType === "head" && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => makeAdmin(profile._id)}
                    >
                      Make Admin
                    </button>
                  )}

                {profile.isAdmin &&
                  profile.adminType === "sub" &&
                  !loadingAuth &&
                  authUser.isAdmin &&
                  authUser.adminType === "head" && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => removeAdmin(profile._id)}
                    >
                      Remove Admin
                    </button>
                  )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

UserCard.propTypes = {
  auth: PropTypes.object.isRequired,
  profile: PropTypes.object.isRequired,
  makeAdmin: PropTypes.func.isRequired,
  removeAdmin: PropTypes.func.isRequired,
  blockUser: PropTypes.func.isRequired,
  unblockUser: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
});

export default connect(mapStateToProps, {
  makeAdmin,
  removeAdmin,
  blockUser,
  unblockUser,
})(UserCard);