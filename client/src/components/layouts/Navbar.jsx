import React, { Fragment, useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { connect } from "react-redux";
import { logOut } from "../../actions/auth";
import logo from "../../019eddbf5bf91320da288c242aefa491.png";
import Notification from "../notification/notifications.jsx";
import "./Navbar.css";
import { socket, notificationStore } from "../../socket";
import api from "../../utils/api";

const Navbar = ({
  auth: { isAuthenticated, loadingAuth, authUser },
  logOut,
}) => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hasAdminNotifications, setHasAdminNotifications] = useState(false);
  const navRef = useRef(null);

  const toggleDropdown = (name) => {
    setActiveDropdown((prev) => (prev === name ? null : name));
  };

  const closeMobile = () => {
    setMobileOpen(false);
    setActiveDropdown(null);
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setActiveDropdown(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Messenger unread count
  const [unreadCount, setUnreadCount] = useState(
    notificationStore.getUnreadCount()
  );

  // Socket connection
  useEffect(() => {
    if (isAuthenticated && authUser && authUser._id) {
      socket.connect();
      socket.emit("addUser", authUser._id);
    } else {
      socket.disconnect();
    }
  }, [isAuthenticated, authUser]);

  // Sync unread count
  useEffect(() => {
    setUnreadCount(notificationStore.getUnreadCount());
    const unsubscribe = notificationStore.subscribe((store) => {
      setUnreadCount(store.getUnreadCount());
    });
    return () => unsubscribe();
  }, []);

  // Admin notifications check
  useEffect(() => {
    const checkAdminNotifications = async () => {
      if (!isAuthenticated || !authUser?.isAdmin) return;
      
      try {
        let count = 0;
        
        // 1. Join requests (all admins)
        const joinRes = await api.get("/api/requests/join");
        count += (joinRes.data?.length || 0);

        // 2. Pending achievements (head admin only)
        if (authUser.adminType === "head") {
          const achRes = await api.get("/api/achievements/pending");
          count += (achRes.data?.achievements?.length || 0);
        }

        setHasAdminNotifications(count > 0);
      } catch (err) {
        console.error("Error fetching admin notifications:", err);
      }
    };

    checkAdminNotifications();
  }, [isAuthenticated, authUser]);

  /* ── Institute Dropdown ── */
  const instituteDropdown = (
    <li className="dropdown">
      <span className="navbar-link" onClick={() => toggleDropdown("institute")}>
        Institute ▾
      </span>
      <ul className={`dropdown-menu ${activeDropdown === "institute" ? "show" : ""}`}>
        <li><Link to="/showcase" onClick={closeMobile}>Showcase</Link></li>
        <li><Link to="/achievements" onClick={closeMobile}>Achievement Awards</Link></li>
        {/* AI Help (generic chat) is parked until the cited-search phase. */}
      </ul>
    </li>
  );

  /* ── Learning Dropdown ── */
  const learningDropdown = (
    <li className="dropdown">
      <span className="navbar-link" onClick={() => toggleDropdown("learning")}>
        <i className="fas fa-graduation-cap"></i> Learning ▾
      </span>
      <ul className={`dropdown-menu ${activeDropdown === "learning" ? "show" : ""}`}>
        <li><Link to="/resources" onClick={closeMobile}>Resource Hub</Link></li>
        <li><Link to="/doubts" onClick={closeMobile}>Doubt Room</Link></li>
      </ul>
    </li>
  );

  /* ── Auth Links ── */
  const authLinks = (
    <>
      <li>
        <Link to="/feed" className="navbar-link" onClick={closeMobile}>
          <i className="fas fa-home"></i> Home
        </Link>
      </li>

      <li className="dropdown">
        <span className="navbar-link" onClick={() => toggleDropdown("opportunities")}>
          Opportunities ▾
        </span>
        <ul className={`dropdown-menu ${activeDropdown === "opportunities" ? "show" : ""}`}>
          <li><Link to="/jobs" onClick={closeMobile}>Jobs</Link></li>
          <li><Link to="/internship-matches" onClick={closeMobile}>Internship Matches</Link></li>
          <li><Link to="/events" onClick={closeMobile}>Events</Link></li>
        </ul>
      </li>

      <li className="dropdown">
        <span className="navbar-link" onClick={() => toggleDropdown("community")}>
          Community ▾
        </span>
        <ul className={`dropdown-menu ${activeDropdown === "community" ? "show" : ""}`}>
          <li><Link to="/stories" onClick={closeMobile}>Stories of Alumni</Link></li>
          <li><Link to="/groups" onClick={closeMobile}>Groups &amp; Cohorts</Link></li>
          <li><Link to="/feed" onClick={closeMobile}>Feed</Link></li>
          <li><Link to="/alumni-directory" onClick={closeMobile}>Alumni Directory</Link></li>
          <li><Link to="/mentor-matches" onClick={closeMobile}>Find a Mentor</Link></li>
          <li><Link to="/mentorship" onClick={closeMobile}>Mentorship Dashboard</Link></li>
        </ul>
      </li>

      {learningDropdown}

      <li>
        <Link to="/profiles?search=" className="navbar-link" onClick={closeMobile}>
          Members
        </Link>
      </li>

      {authUser && authUser.role && authUser.role.toLowerCase() !== "student" && (
        <li>
          <Link to="/support-initiatives" className="navbar-link" onClick={closeMobile}>
            Support Us
          </Link>
        </li>
      )}

      {authUser?.isAdmin && (
        <li>
          <Link to="/dashboard" className="navbar-link" style={{ position: "relative" }} onClick={closeMobile}>
            Dashboard
            {hasAdminNotifications && (
              <span 
                className="notification-dot" 
                style={{ top: "0px", right: "-8px", width: "8px", height: "8px", backgroundColor: "#ef4444", borderRadius: "50%", position: "absolute", boxShadow: "0 0 0 2px #0f2044" }} 
              />
            )}
          </Link>
        </li>
      )}

      <li>
        <Link to="/messenger" className="navbar-link" style={{ position: "relative" }} onClick={closeMobile}>
          <i className="fas fa-comments"></i>
          {unreadCount > 0 && (
            <span className="navbar-messenger-badge">{unreadCount}</span>
          )}
          <span className="hide-sm">Messenger</span>
        </Link>
      </li>

      <li><Notification /></li>

      <li className="dropdown">
        <span className="navbar-link" onClick={() => toggleDropdown("profile")}>
          <i className="fas fa-user"></i>
        </span>
        <ul className={`dropdown-menu right ${activeDropdown === "profile" ? "show" : ""}`}>
          <li><Link to="/userprofile" onClick={closeMobile}>Profile</Link></li>
          <li><Link to="/" onClick={() => { logOut(); closeMobile(); }}>Logout</Link></li>
        </ul>
      </li>
    </>
  );

  /* ── Guest Links ── */
  const guestLinks = (
    <>
      <li><Link to="/help" className="navbar-link" onClick={closeMobile}>Help</Link></li>
      <li><Link to="/stories" className="navbar-link" onClick={closeMobile}>Stories</Link></li>
      <li><Link to="/login" className="navbar-link btn-login" onClick={closeMobile}>Login</Link></li>
      <li><Link to="/register" className="navbar-link btn-register" onClick={closeMobile}>Register</Link></li>
    </>
  );

  return (
    <nav className="navbar" ref={navRef}>
      {/* Logo */}
      <div className="nav-left">
        <img src={logo} alt="logo" className="logo-img" />
        <Link to="/" className="logo-text">IIITA AlumniConnect</Link>
      </div>

      {/* Hamburger button — mobile only */}
      <button
        className="hamburger"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label="Toggle menu"
      >
        <span className={`hamburger-line ${mobileOpen ? "open" : ""}`} />
        <span className={`hamburger-line ${mobileOpen ? "open" : ""}`} />
        <span className={`hamburger-line ${mobileOpen ? "open" : ""}`} />
      </button>

      {/* Overlay — mobile only */}
      {mobileOpen && (
        <div className="mobile-overlay" onClick={closeMobile} />
      )}

      {/* Nav links */}
      {!loadingAuth && (
        <ul className={`nav-links ${mobileOpen ? "mobile-open" : ""}`}>
          {instituteDropdown}
          {isAuthenticated ? authLinks : guestLinks}
        </ul>
      )}
    </nav>
  );
};

const mapStateToProps = (state) => ({ auth: state.auth });
export default connect(mapStateToProps, { logOut })(Navbar);