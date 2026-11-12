import React from "react";
import "./Footer.css";

function Footer() {
  return (
    <footer className="footer-class">
      <div className="container footer-container">
        <div className="footer-grid">

          {/* COLUMN 1: BRAND & MISSION */}
          <div className="footer-col footer-col-brand">
            <div className="footer-brand">
              <span className="footer-logo-dot" />
              <span className="footer-logo-text">AlumniConnect</span>
            </div>
            <p className="footer-tagline">
              Official alumni network of the Indian Institute of Information Technology, Allahabad.
            </p>
            <div className="social-icons">
              <a
                href="https://www.linkedin.com/school/indian-institute-of-information-technology-allahabad-india/"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
              >
                <i className="fab fa-linkedin-in" />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
                <i className="fab fa-facebook-f" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter">
                <i className="fab fa-twitter" />
              </a>
            </div>
          </div>

          {/* COLUMN 2: QUICK LINKS */}
          <div className="footer-col">
            <h6 className="footer-heading">Quick Links</h6>
            <ul className="footer-links">
              <li>
                <a href="https://iiita.ac.in" target="_blank" rel="noreferrer">
                  IIITA Official Website
                </a>
              </li>
              <li>
                <a href="https://alumni.iiita.ac.in" target="_blank" rel="noreferrer">
                  Central Alumni Portal
                </a>
              </li>
              <li>
                <a
                  href="/Manual.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="manual-btn"
                >
                  <i className="fas fa-file-pdf" />
                  <span>User Manual</span>
                </a>
              </li>
            </ul>
          </div>

          {/* COLUMN 3: CONTACT & OFFICE */}
          <div className="footer-col footer-col-contact">
            <h6 className="footer-heading">Contact &amp; Location</h6>
            <div className="contact-item">
              <i className="fas fa-map-marker-alt contact-icon" />
              <span className="contact-text">
                Office of Alumni &amp; External Relations, Admin Ext-1, IIIT Allahabad, Prayagraj - 211015, UP, India
              </span>
            </div>

            <div className="contact-item">
              <i className="fas fa-envelope contact-icon" />
              <div className="contact-text">
                <a href="mailto:iiita.alumniconnect@gmail.com">iiita.alumniconnect@gmail.com</a>
                <span className="contact-separator">·</span>
                <a href="mailto:alumni.coordinator@iiita.ac.in">alumni.coordinator@iiita.ac.in</a>
              </div>
            </div>

            <div className="contact-item">
              <i className="fas fa-phone-alt contact-icon" />
              <div className="contact-text contact-phones">
                <span>0532-292-2599</span>
                <span className="contact-separator">·</span>
                <span className="whatsapp-line">
                  <i className="fab fa-whatsapp" /> +91 9305653537
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="footer-copyright">
        <div className="container footer-copyright-inner">
          <span>&copy; {new Date().getFullYear()} IIITA Alumni Affairs. All rights reserved.</span>
          <a
            href="https://www.linkedin.com/in/iiita-alumni-affairs/"
            target="_blank"
            rel="noreferrer"
            className="footer-affairs-link"
          >
            IIITA Alumni Affairs
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
