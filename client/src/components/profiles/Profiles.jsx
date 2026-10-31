import React, { Fragment, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import Spinner from "../layouts/Spinner";
import UserCard from "./UserCard";
import { getUsers, getUsersByType } from "../../actions/users";
import { closeSideNav } from "../../actions/alert";
import UsersByType from "./UsersByType";
import "./Profiles.css";
const Profiles = ({
  getUsers,
  closeSideNav,
  getUsersByType,
  user: { users, loading },
}) => {
  const [userTypes, setUserTypes] = useState({
    students: [],
    faculty: [],
    alumni: [],
    admins: [],
  });

  const [search, setSearch] = useState("");

  useEffect(() => {
    closeSideNav();

    const fetchData = async () => {
      try {
        const [students, alumni, faculty, admins] = await Promise.all([
          getUsersByType("student"),
          getUsersByType("alumni"),
          getUsersByType("faculty"),
          getUsersByType("admin"),
        ]);

        setUserTypes({
          students,
          alumni,
          faculty,
          admins,
        });

        // getUsers(""); // initial load - now handled by debounced search effect
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
  }, [getUsers, closeSideNav, getUsersByType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      getUsers(search.trim());
    }, 400); // 400ms debounce
    return () => clearTimeout(timer);
  }, [search, getUsers]);

  return (
    <Fragment>
      {loading ? (
        <Spinner />
      ) : (
        <Fragment>
          <div className="profiles-header">
            <h1>Members</h1>
            <p>Browse and connect with members</p>
          </div>

          {/* 🔍 Search */}
          <div className="search-container">
            <form onSubmit={(e) => e.preventDefault()} className="search-form">
              <input
                type="text"
                placeholder="Search members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>
          </div>

          {/* 📊 Stats */}
          <div className="stats-container">
            <UsersByType users={userTypes.alumni} label="Alumni" />
            <UsersByType users={userTypes.students} label="Students" />
            <UsersByType users={userTypes.faculty} label="Faculty" />
            <UsersByType users={userTypes.admins} label="Admin" />
          </div>

          <h5 className="result-count">
            {users?.length || 0} users found
          </h5>

          {/* 👥 Users Grid */}
          <div className="profiles-grid">
            {users && users.length > 0 ? (
              users.map((user) => (
                <UserCard key={user._id} profile={user} />
              ))
            ) : (
              <h4 className="no-users">No Profiles Found</h4>
            )}
          </div>
        </Fragment>
      )}
    </Fragment>
  );
};

Profiles.propTypes = {
  user: PropTypes.object.isRequired,
  getUsers: PropTypes.func.isRequired,
  closeSideNav: PropTypes.func.isRequired,
  getUsersByType: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  user: state.user,
});

export default connect(mapStateToProps, {
  getUsers,
  closeSideNav,
  getUsersByType,
})(Profiles);