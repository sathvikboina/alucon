import React, { useEffect, Fragment } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import Spinner from "../layouts/Spinner";
import { getUserById } from "../../actions/users";
import { useHistory } from "react-router-dom";
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
            <ProfileAbout profile={userProfile} />

            <div style={styles.expEduGrid}>
              <div
                style={{
                  background: "#fff",
                  border: "0.5px solid #B5D4F4",
                  borderRadius: "12px",
                  padding: "1.25rem",
                }}
              >
                <h2
                  style={{
                    fontSize: "15px",
                    fontWeight: "500",
                    color: "#185FA5",
                    marginBottom: "12px",
                    borderBottom: "1px solid #E6F1FB",
                    paddingBottom: "8px",
                  }}
                >
                  Experience
                </h2>
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
                <h2
                  style={{
                    fontSize: "15px",
                    fontWeight: "500",
                    color: "#185FA5",
                    marginBottom: "12px",
                    borderBottom: "1px solid #E6F1FB",
                    paddingBottom: "8px",
                  }}
                >
                  Education
                </h2>
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