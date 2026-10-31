import React, { useEffect } from "react";
import { Link, Redirect } from "react-router-dom";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { closeSideNav } from "../../actions/alert";
import bg from "./bg.jpeg";
import "./Home.css";

const FEATURES = [
  {
    icon: "🎓",
    title: "Mentorship",
    desc: "Connect with alumni and faculty who have walked the path before you.",
  },
  {
    icon: "💼",
    title: "Opportunities",
    desc: "Jobs, internships and referrals shared across the network.",
  },
  {
    icon: "🤝",
    title: "Community",
    desc: "Groups, discussions and events across batches and programmes.",
  },
];

const Home = ({ closeSideNav, isAuth }) => {
  useEffect(() => {
    closeSideNav();
  }, [closeSideNav]);

  if (isAuth) {
    return <Redirect to="/feed" />;
  }

  return (
    <section className="landing" style={{ backgroundImage: `url(${bg})` }}>
      <div className="dark-overlay">

        {/* ── Top bar ── */}
        <header className="landing-topbar">
          <div className="landing-logo">
            <div className="landing-logo-mark">IIITA</div>
            <div className="landing-logo-text">
              <strong>IIIT Allahabad</strong>
              Alumni Network
            </div>
          </div>
          <div className="landing-topbar-right">
            <span className="landing-est">Est. 1999</span>
            <a
              href="https://www.iiita.ac.in"
              target="_blank"
              rel="noreferrer"
              className="landing-topbar-link"
            >
              iiita.ac.in ↗
            </a>
          </div>
        </header>

        {/* ── Hero ── */}
        <div className="landing-inner">

          <div className="institute-badge">
            <span className="badge-dot" />
            Indian Institute of Information Technology, Allahabad
          </div>

          <h1 className="landing-title">AlumniConnect</h1>

          <p className="landing-tagline">Where Alumni Create Impact</p>

          <p className="landing-lede">
            A private network for IIIT Allahabad students, alumni and faculty —
            mentorship, opportunities and community in one place.
          </p>

          <div className="landing-divider" />

          {/* Stats */}
          <div className="landing-stats">
            <div className="stat-item">
              <span className="stat-value">1999</span>
              <span className="stat-label">Established</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">9800+</span>
              <span className="stat-label">Alumni</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">2718+</span>
              <span className="stat-label">Students</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">25+</span>
              <span className="stat-label">Years</span>
            </div>
          </div>

          {/* Auth Buttons */}
          <div className="auth-buttons">
            <Link to="/register" className="btn btn-primary">
              Join the Network
            </Link>
            <Link to="/login" className="btn btn-light">
              Sign In
            </Link>
          </div>

          <p className="landing-note">
            Open to IIIT Allahabad students, alumni and faculty.
          </p>
        </div>

        {/* ── Feature cards ── */}
        <div className="landing-features">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <span className="feature-icon">{f.icon}</span>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* ── Footer bar ── */}
        <div className="landing-footer">
          <p>© {new Date().getFullYear()} IIIT Allahabad Alumni Portal. All rights reserved.</p>
          <a href="https://www.iiita.ac.in" target="_blank" rel="noreferrer">
            iiita.ac.in ↗
          </a>
        </div>

      </div>
    </section>
  );
};

Home.propTypes = {
  isAuth: PropTypes.bool,
  closeSideNav: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  isAuth: state.auth.isAuthenticated,
});

export default connect(mapStateToProps, { closeSideNav })(Home);
