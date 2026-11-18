import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { useHistory } from "react-router-dom";
import Spinner from "../layouts/Spinner";

/**
 * `/userprofile` is kept as a stable entry point for older links, but the
 * canonical profile URL is `/profile/:id` so a profile opened from a post and
 * the one opened from the navbar are always the same page.
 */
const OwnProfileRedirect = ({ auth: { authUser, loadingAuth } }) => {
  const history = useHistory();

  useEffect(() => {
    if (loadingAuth) return;
    if (authUser && authUser._id) {
      history.replace(`/profile/${authUser._id}`);
    } else {
      history.replace("/login");
    }
  }, [authUser, loadingAuth, history]);

  return <Spinner />;
};

OwnProfileRedirect.propTypes = {
  auth: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({ auth: state.auth });

export default connect(mapStateToProps)(OwnProfileRedirect);
