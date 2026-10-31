import React from "react";
import "./Footer.css";
// import { FaWhatsapp } from "react-icons/fa";
function Footer() {
return (
<footer className="footer-class">

<div className="container footer-container">
<div className="row align-items-start">

{/* LEFT SIDE */}
<div className="col-md-5 footer-left">
<h6 className="footer-heading">Connect With Us</h6>

<div className="social-icons">
<a href="https://www.linkedin.com/school/indian-institute-of-information-technology-allahabad-india/" target="_blank" rel="noreferrer">
<i className="fab fa-linkedin"></i>
</a>

<a href="https://facebook.com" target="_blank" rel="noreferrer">
<i className="fab fa-facebook"></i>
</a>

<a href="https://twitter.com" target="_blank" rel="noreferrer">
<i className="fab fa-twitter"></i>
</a>
</div>

<ul className="footer-links">
<li>
<a href="https://iiita.ac.in" target="_blank" rel="noreferrer">
IIITA Official Website
</a>
</li>

<li>
<a href="https://alumni.iiita.ac.in" target="_blank" rel="noreferrer">
Alumni Portal
</a>
</li>

<li>
<a
href="/Manual.pdf"
target="_blank"
rel="noopener noreferrer"
className="manual-btn"
>
📄 DOWNLOAD MANUAL
</a>
</li>
</ul>
</div>


{/* RIGHT SIDE */}
<div className="col-md-7 footer-right">
<h6 className="footer-heading">Contact Us</h6>

<div className="help-section">
<i className="fas fa-map-marker-alt"></i>
<p className="contact-info-text">
Office of Alumni and External Relations, Admin Extension-1,
IIIT Allahabad, Devghat, Jhalwa Prayagraj - 211015 Uttar Pradesh, India
</p>
</div>

<div className="help-section">
<i className="fa fa-envelope"></i>
<div>
<p className="contact-info-text">
iiita.alumniconnect@gmail.com
</p>
<p className="contact-info-text">
alumni.coordinator@iiita.ac.in
</p>
</div>
</div>

<div className="help-section">
<i className="fa fa-phone"></i>
<div>
<p className="contact-info-text">☎️ Landline: 0532-292-2599</p>
<p className="contact-info-text">💬 WhatsApp: +91 9305653537</p>
</div>
</div>

</div>

</div>
</div>


<div className="footer-copyright text-center py-3">
© 2026 Copyright:
<a
href="https://www.linkedin.com/in/iiita-alumni-affairs/"
target="_blank"
rel="noreferrer"
>
{" "}IIITA Alumni Affairs
</a>
</div>

</footer>
);
}

export default Footer;