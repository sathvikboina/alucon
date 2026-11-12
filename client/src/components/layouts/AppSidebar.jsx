import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { connect } from "react-redux";
import "./AppSidebar.css";

const STORAGE_KEY = "alumni:sidebar-collapsed";

const SECTIONS = [
  {
    label: "Community",
    items: [
      { to: "/feed", icon: "fa-stream", label: "Feed", match: ["/feed"] },
      { to: "/search", icon: "fa-search", label: "Search", match: ["/search"] },
      {
        to: "/alumni-directory",
        icon: "fa-user-friends",
        label: "People",
        match: ["/alumni-directory"],
      },
    ],
  },
  {
    label: "Career",
    items: [
      {
        to: "/jobs",
        icon: "fa-briefcase",
        label: "Opportunities",
        match: ["/jobs", "/company", "/archivejobs", "/createjob"],
      },
      {
        to: "/internship-matches",
        icon: "fa-bullseye",
        label: "Internship matches",
        match: ["/internship-matches"],
      },
      {
        to: "/mentor-matches",
        icon: "fa-handshake",
        label: "Mentorship",
        match: ["/mentor-matches", "/mentorship"],
      },
    ],
  },
  {
    label: "Campus",
    items: [
      { to: "/events", icon: "fa-calendar-alt", label: "Events", match: ["/events"] },
      { to: "/resources", icon: "fa-book-open", label: "Resources", match: ["/resources"] },
      { to: "/groups", icon: "fa-users", label: "Groups", match: ["/groups"] },
    ],
  },
  {
    label: "You",
    items: [
      {
        to: "/messenger",
        icon: "fa-comment-dots",
        label: "Messages",
        match: ["/messenger"],
      },
      {
        to: "/userprofile",
        icon: "fa-user-circle",
        label: "My profile",
        match: ["/userprofile", "/profile", "/edit-profile"],
      },
    ],
  },
];

const AppSidebar = ({ auth: { authUser } }) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch (error) {
      // Storage may be unavailable; keep the expanded default.
    }
  }, []);

  const toggle = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch (error) {
        // Storage unavailable; the in-page state still works.
      }
      return next;
    });
  };

  const isActive = (match) =>
    match.some(
      (prefix) =>
        location.pathname === prefix ||
        location.pathname.startsWith(`${prefix}/`)
    );

  const adminItems = authUser?.isAdmin
    ? [
        {
          to: "/dashboard",
          icon: "fa-shield-alt",
          label: "Admin dashboard",
          match: ["/dashboard"],
        },
        {
          to: "/analytics",
          icon: "fa-chart-line",
          label: "Analytics",
          match: ["/analytics"],
        },
        {
          to: "/admin/support-responses",
          icon: "fa-life-ring",
          label: "Support inbox",
          match: ["/admin/support-responses"],
        },
      ]
    : [];

  return (
    <aside
      className={`app-sidebar ${collapsed ? "collapsed" : ""}`}
      aria-label="Main navigation"
    >
      <div className="app-sidebar-top">
        {!collapsed && <span className="app-sidebar-eyebrow">AlumniConnect</span>}
        <button
          type="button"
          className="app-sidebar-toggle"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <i
            className={`fas ${collapsed ? "fa-angle-double-right" : "fa-angle-double-left"}`}
          />
        </button>
      </div>

      <nav className="app-sidebar-nav">
        {SECTIONS.map((section) => (
          <div className="app-sidebar-section" key={section.label}>
            {!collapsed && (
              <p className="app-sidebar-label">{section.label}</p>
            )}
            {section.items.map((item) => {
              const active = isActive(item.match);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`app-sidebar-link ${active ? "active" : ""}`}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                >
                  <i className={`fas ${item.icon}`} aria-hidden="true" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}

        {adminItems.length > 0 && (
          <div className="app-sidebar-section app-sidebar-admin">
            {!collapsed && <p className="app-sidebar-label">Admin</p>}
            {adminItems.map((item) => {
              const active = isActive(item.match);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`app-sidebar-link ${active ? "active" : ""}`}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                >
                  <i className={`fas ${item.icon}`} aria-hidden="true" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {!collapsed && authUser && (
        <Link to="/userprofile" className="app-sidebar-footer">
          <div className="app-sidebar-avatar">
            {authUser.name
              ? authUser.name
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase()
              : "II"}
          </div>
          <div className="app-sidebar-user">
            <strong>{authUser.name || "IIITA member"}</strong>
            <small>{authUser.role || "member"}</small>
          </div>
        </Link>
      )}
    </aside>
  );
};

const mapStateToProps = (state) => ({ auth: state.auth });

export default connect(mapStateToProps)(AppSidebar);
