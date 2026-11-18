import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { connect } from "react-redux";
import "./AppSidebar.css";

const STORAGE_KEY = "alumni:sidebar-collapsed";

const BASE_SECTIONS = [
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
      { to: "/groups", icon: "fa-users", label: "Groups", match: ["/groups"] },
      { to: "/events", icon: "fa-calendar-alt", label: "Events", match: ["/events"] },
    ],
  },
  {
    label: "Career",
    items: [
      {
        to: "/jobs",
        icon: "fa-briefcase",
        label: "Opportunities",
        match: ["/jobs", "/company", "/createjob"],
      },
      {
        to: "/internship-matches",
        icon: "fa-bullseye",
        label: "Internship matches",
        match: ["/internship-matches"],
      },
      {
        to: "/doors",
        icon: "fa-door-open",
        label: "Open Doors",
        match: ["/doors"],
      },
      {
        to: "/warm-paths",
        icon: "fa-route",
        label: "Warm Paths",
        match: ["/warm-paths"],
      },
      {
        to: "/mentorship",
        icon: "fa-handshake",
        label: "Mentorship",
        match: ["/mentor-matches", "/mentorship"],
      },
    ],
  },
  {
    label: "Campus",
    items: [
      { to: "/resources", icon: "fa-book-open", label: "Resources", match: ["/resources"] },
      { to: "/doubts", icon: "fa-question-circle", label: "Doubts", match: ["/doubts"] },
      { to: "/showcase", icon: "fa-star", label: "Showcase", match: ["/showcase"] },
      { to: "/gallery", icon: "fa-images", label: "Gallery", match: ["/gallery"] },
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
    ],
  },
];

const AppSidebar = ({ auth: { authUser } }) => {
  const location = useLocation();
  const profilePath = authUser?._id ? `/profile/${authUser._id}` : "/userprofile";
  const isStudent =
    String(authUser?.role || "").toLowerCase() === "student";
  const sectionsWithProfile = BASE_SECTIONS.map((section) =>
    section.label === "You"
      ? {
          ...section,
          items: [
            ...section.items,
            {
              to: profilePath,
              icon: "fa-user-circle",
              label: "My profile",
              match: ["/userprofile", "/profile", "/edit-profile"],
            },
          ],
        }
      : section
  );
  const SECTIONS = isStudent
    ? sectionsWithProfile
    : sectionsWithProfile.map((section) =>
        section.label === "You"
          ? {
              ...section,
              items: [
                ...section.items,
                {
                  to: "/support-initiatives",
                  icon: "fa-hands-helping",
                  label: "Support Us",
                  match: ["/support-initiatives"],
                },
              ],
            }
          : section
      );
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
        <Link to={profilePath} className="app-sidebar-footer">
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
