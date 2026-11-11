import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { getJoinRequests } from "../../actions/request";
import { getFeedbacks } from "../../actions/extras";
import { Link } from "react-router-dom";
import JoinRequestCard from "../requests/JoinRequestCard";
import Spinner from "../layouts/Spinner";
import Settings from "../layouts/Settings";
import DisplayFeedbacks from "./DisplayFeedbacks";
import AdminShowcase from "../../pages/AdminShowcase";
import AdminAchievements from "../achievements/AdminAchievements";
import api from "../../utils/api";
import "./AdminDash.css";

const TAB_META = {
  all:          { label: "All Requests",      desc: "Manage all pending join requests" },
  student:      { label: "Students",           desc: "Filter by student role" },
  alumni:       { label: "Alumni",             desc: "Filter by alumni role" },
  professor:    { label: "Professors",         desc: "Filter by professor role" },
  feedbacks:    { label: "Feedbacks / Queries",desc: "View user feedback and queries" },
  settings:     { label: "Settings",           desc: "Manage system settings" },
  showcase:     { label: "Showcase Manager",   desc: "Manage showcase items" },
  achievements: { label: "Achievements",       desc: "Manage achievement listings" },
};

const AdminDash = ({
  getJoinRequests,
  getFeedbacks,
  request: { joinRequests, loading },
  auth: { authUser },
  extras,
}) => {
  const [activeTab, setActiveTab] = useState("all");
  const [pendingAchievementsCount, setPendingAchievementsCount] = useState(0);

  useEffect(() => {
    getJoinRequests();
    getFeedbacks();

    const fetchPending = async () => {
      try {
        const res = await api.get("/api/achievements/pending");
        setPendingAchievementsCount(res.data.achievements?.length || 0);
      } catch (err) {
        console.error(err);
      }
    };
    if (authUser?.adminType === "head") {
      fetchPending();
    }
  }, [getJoinRequests, getFeedbacks, authUser]);

  const filteredRequests =
    activeTab === "all"
      ? joinRequests || []
      : ["student", "alumni", "professor"].includes(activeTab)
      ? (joinRequests || []).filter(
          (item) => item.role?.toLowerCase() === activeTab.toLowerCase()
        )
      : [];

  const isRequestTab = ["all", "student", "alumni", "professor"].includes(activeTab);
  const meta = TAB_META[activeTab] || TAB_META.all;

  return (
    <div className="admin-container">

      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">Admin Panel</div>

        <ul className="sidebar-menu">
          {["all", "student", "alumni", "professor", "feedbacks"].map((tab) => {
            const hasNotification = tab === "all" && joinRequests && joinRequests.length > 0;
            return (
              <li
                key={tab}
                className={activeTab === tab ? "active" : ""}
                onClick={() => setActiveTab(tab)}
                style={{ position: "relative" }}
              >
                {TAB_META[tab].label}
                {hasNotification && <span className="notification-dot" />}
              </li>
            );
          })}

          {authUser?.adminType === "head" && (
            <li
              className={activeTab === "settings" ? "active" : ""}
              onClick={() => setActiveTab("settings")}
            >
              Settings
            </li>
          )}

          {authUser?.adminType === "head" && (
            <li>
              <Link to="/analytics">
                <i className="fas fa-chart-line" /> Analytics
              </Link>
            </li>
          )}

          <li
            className={activeTab === "showcase" ? "active" : ""}
            onClick={() => setActiveTab("showcase")}
          >
            Showcase Manager
          </li>

          <li
            className={activeTab === "achievements" ? "active" : ""}
            onClick={() => setActiveTab("achievements")}
            style={{ position: "relative" }}
          >
            Achievements
            {pendingAchievementsCount > 0 && <span className="notification-dot" />}
          </li>
        </ul>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">

        {/* Hero header */}
        <div className="dashboard-header">
          <h1>{meta.label}</h1>
          <p>{meta.desc}</p>
        </div>

        {/* Body */}
        <div className="admin-body">
          {loading && !["showcase", "achievements"].includes(activeTab) ? (
            <Spinner />
          ) : (
            <div className={activeTab === "achievements" ? "" : "card-container"}>

              {activeTab === "settings" && <Settings />}

              {activeTab === "feedbacks" && (
                <DisplayFeedbacks feedbacks={extras?.feedbacks || []} />
              )}

              {activeTab === "showcase" && <AdminShowcase />}

              {activeTab === "achievements" && <AdminAchievements />}

              {isRequestTab && (
                filteredRequests.length === 0 ? (
                  <div className="no-data">No requests found</div>
                ) : (
                  filteredRequests.map((item) => (
                    <div key={item._id} className="card">
                      <JoinRequestCard request={item} />
                    </div>
                  ))
                )
              )}

            </div>
          )}
        </div>

      </main>
    </div>
  );
};

const mapStateToProps = (state) => ({
  request: state.request,
  auth: state.auth,
  extras: state.extras,
});

export default connect(mapStateToProps, {
  getJoinRequests,
  getFeedbacks,
})(AdminDash);