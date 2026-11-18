import React, { useEffect, Fragment } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import Spinner from "../layouts/Spinner";
import { getUserById } from "../../actions/users";
import { useHistory, Link } from "react-router-dom";
import ProfileTop from "./ProfileTop";
import ProfileAbout from "./ProfileAbout";
import ProfileExperience from "./ProfileExperience";
import ProfileEducation from "./ProfileEducation";
import MentorshipButton from "../mentorship/MentorshipButton";

const styles = {
  page: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "1.5rem 1rem",
    fontFamily: "inherit",
  },
  backRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "1.5rem",
  },
  btnBack: {
    background: "#fff",
    border: "0.5px solid #B5D4F4",
    color: "#185FA5",
    padding: "7px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
  },
  profileGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  expEduGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
};

const Profile = ({
  getUserById,
  auth: { loadingAuth, authUser },
  users: { userProfile, loading },
  match,
}) => {
  const history = useHistory();
  const isOwnProfile =
    Boolean(authUser && userProfile) && authUser._id === userProfile._id;

  useEffect(() => {
    getUserById(match.params.id);
  }, [getUserById, match.params.id]);

  return (
    <Fragment>
      {userProfile === null || loading ? (
        <Spinner />
      ) : (
        <div style={styles.page}>
          <div style={styles.backRow}>
            <button style={styles.btnBack} onClick={() => history.goBack()}>
              ← Back to Profiles
            </button>
            {/* Own profile renders exactly like anyone else's; editing lives
                beside the About heading inside ProfileAbout. */}
            {authUser &&
              userProfile &&
              authUser._id !== userProfile._id &&
              ["alumni", "faculty"].includes(
                String(userProfile.role).toLowerCase()
              ) &&
              userProfile.mentorship?.available === true && (
                <MentorshipButton receiverId={userProfile._id} />
              )}
          </div>

          <div style={styles.profileGrid}>
            <ProfileTop profile={userProfile} />
            <ProfileAbout profile={userProfile} canEdit={isOwnProfile} />

            <div style={styles.expEduGrid}>
              <div
                style={{
                  background: "#fff",
                  border: "0.5px solid #B5D4F4",
                  borderRadius: "12px",
                  padding: "1.25rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "12px",
                    borderBottom: "1px solid #E6F1FB",
                    paddingBottom: "8px",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "15px",
                      fontWeight: "500",
                      color: "#185FA5",
                      margin: 0,
                    }}
                  >
                    Experience
                  </h2>
                  {isOwnProfile && (
                    <Link
                      to="/add-experience"
                      style={{
                        background: "#E6F1FB",
                        border: "0.5px solid #B5D4F4",
                        color: "#185FA5",
                        padding: "4px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      + Add
                    </Link>
                  )}
                </div>
                {userProfile.experience.length > 0 ? (
                  userProfile.experience.map((exp) => (
                    <ProfileExperience key={exp._id} experience={exp} />
                  ))
                ) : (
                  <p
                    style={{
                      textAlign: "center",
                      fontSize: "13px",
                      color: "#888",
                      padding: "2rem 0",
                    }}
                  >
                    No experience to display
                  </p>
                )}
              </div>

              <div
                style={{
                  background: "#fff",
                  border: "0.5px solid #B5D4F4",
                  borderRadius: "12px",
                  padding: "1.25rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "12px",
                    borderBottom: "1px solid #E6F1FB",
                    paddingBottom: "8px",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "15px",
                      fontWeight: "500",
                      color: "#185FA5",
                      margin: 0,
                    }}
                  >
                    Education
                  </h2>
                  {isOwnProfile && (
                    <Link
                      to="/add-education"
                      style={{
                        background: "#E6F1FB",
                        border: "0.5px solid #B5D4F4",
                        color: "#185FA5",
                        padding: "4px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      + Add
                    </Link>
                  )}
                </div>
                {userProfile.education.length > 0 ? (
                  userProfile.education.map((edu) => (
                    <ProfileEducation key={edu._id} education={edu} />
                  ))
                ) : (
                  <p
                    style={{
                      textAlign: "center",
                      fontSize: "13px",
                      color: "#888",
                      padding: "2rem 0",
                    }}
                  >
                    No education to display
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
};

Profile.propTypes = {
  getUserById: PropTypes.func.isRequired,
  auth: PropTypes.object.isRequired,
  users: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  users: state.user,
});

export default connect(mapStateToProps, { getUserById })(Profile);