import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import { setAlert, closeSideNav } from "../../actions/alert";
import { register } from "../../actions/auth";
import PropTypes from "prop-types";
import "./Register.css";

const getPasswordChecks = (password) => ({
  length: password.length >= 8,
  upper: /[A-Z]/.test(password),
  lower: /[a-z]/.test(password),
  number: /\d/.test(password),
  special: /[@$!%*?&]/.test(password),
});

const getStrength = (checks) => {
  const passed = Object.values(checks).filter(Boolean).length;
  if (passed === 5) return "Strong";
  if (passed >= 3) return "Medium";
  return "Weak";
};

const Register = ({ setAlert, register, closeSideNav }) => {
  useEffect(() => closeSideNav(), [closeSideNav]);

  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);

  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const [formInput, setFormInput] = useState({
    name: "",
    email: "",
    password: "",
    password_confirm: "",
    role: "student",
    program: "btech-it",
    starting_year: "",
    passing_year: "",
    designation: "",
    organisation: "",
    location: "",
    department: "",
  });

  const {
    name,
    email,
    password,
    password_confirm,
    role,
    program,
    starting_year,
    passing_year,
    designation,
    organisation,
    location,
    department
  } = formInput;

  const checks = getPasswordChecks(password);
  const passwordStrength = getStrength(checks);

  const strengthPercent =
    (Object.values(checks).filter(Boolean).length / 5) * 100;

  const onChange = (e) =>
    setFormInput({ ...formInput, [e.target.name]: e.target.value });

  useEffect(() => {
    let interval;
    if (showOtpInput && timer > 0) {
      interval = setInterval(() => setTimer((p) => p - 1), 1000);
    } else if (timer === 0) setCanResend(true);
    return () => clearInterval(interval);
  }, [showOtpInput, timer]);

  const onSubmit = async (e) => {
    e.preventDefault();

    if (password !== password_confirm)
      return setAlert("Passwords do not match", "danger");

    if (passwordStrength === "Weak")
      return setAlert("Password not strong enough", "danger");

    if (starting_year > passing_year)
      return setAlert("Invalid year range", "danger");

    setLoading(true);
    const result = await register({ ...formInput });
    setLoading(false);

    if (result) {
      setOtpToken(result.otp_token || "");
      setShowOtpInput(true);
      setTimer(60);
      setCanResend(false);
    }
  };

  const verifyOtp = async () => {
    const res = await fetch("/api/users/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });

    const data = await res.json();
    if (res.ok) {
      setPendingApproval(true);
      setShowOtpInput(false);
    } else alert(data.msg);
  };

  const resendOtp = async () => {
    const res = await fetch("/api/users/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp_token: otpToken }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.msg || "Could not resend OTP");

    setOtpToken(data.otp_token || otpToken);
    setTimer(60);
    setCanResend(false);
  };

  const resetOtp = async () => {
    const res = await fetch("/api/users/reset-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp_token: otpToken }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.msg || "Could not reset OTP");

    setShowOtpInput(false);
    setOtp("");
    setOtpToken("");
  };

  return (
    <div className="form-container">
      <h1>Sign Up</h1>

      {!showOtpInput && (
        <form className="auth-form" onSubmit={onSubmit}>
          <input name="name" placeholder="Name" value={name} onChange={onChange} required />
          <input name="email" placeholder="Email" value={email} onChange={onChange} required />

          <select name="role" value={role} onChange={onChange}>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="alumni">Alumni</option>
          </select>

          {/* PASSWORD FIELD */}
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={password}
              onChange={onChange}
              required
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "10px",
                top: "10px",
                cursor: "pointer",
                fontSize: "12px",
                color: "#008cc9",
              }}
            >
              {showPassword ? "Hide" : "Show"}
            </span>
          </div>

          <input
            type="password"
            name="password_confirm"
            placeholder="Confirm Password"
            value={password_confirm}
            onChange={onChange}
            required
          />

          {/* PROGRESS BAR */}
          <div style={{ height: "6px", background: "#eee", borderRadius: "4px", marginTop: "8px" }}>
            <div
              style={{
                width: `${strengthPercent}%`,
                height: "100%",
                background:
                  passwordStrength === "Strong"
                    ? "green"
                    : passwordStrength === "Medium"
                      ? "orange"
                      : "red",
                borderRadius: "4px",
                transition: "0.3s",
              }}
            />
          </div>

          <div className="password-strength">
            Strength: {passwordStrength}
          </div>

          {/* CHECKLIST */}
          <ul style={{ fontSize: "12px", marginTop: "8px" }}>
            <li>{checks.length ? "✔" : "✖"} 8+ characters</li>
            <li>{checks.upper ? "✔" : "✖"} Uppercase letter</li>
            <li>{checks.lower ? "✔" : "✖"} Lowercase letter</li>
            <li>{checks.number ? "✔" : "✖"} Number</li>
            <li>{checks.special ? "✔" : "✖"} Special character</li>
          </ul>

          {/* Academic */}
          {(role === "student" || role === "alumni") && (
            <div className="academic-section">
              <select name="program" value={program} onChange={onChange}>
                <option value="btech-it">B.Tech IT</option>
                <option value="btech-ece">B.Tech ECE</option>
                <option value="btech-it-bi">B.Tech IT-Business Informatics</option>
                <option value="mtech-it">M.Tech</option>
                <option value="mba">MBA</option>
                <option value="phd">PHD</option>
                <option value="other">Other</option>

              </select>
              <input name="starting_year" value={starting_year} onChange={onChange} placeholder="Start Year" />
              <input name="passing_year" value={passing_year} onChange={onChange} placeholder="Passing Year" />
            </div>
          )}

          {role === "alumni" && (
            <div className="alumni-section">
              <input name="organisation" value={organisation} onChange={onChange} placeholder="Organisation" />
              <input name="location" value={location} onChange={onChange} placeholder="Location" />
              <input name="designation" value={designation} onChange={onChange} placeholder="Designation" />
            </div>
          )}

          {role === "faculty" && (
            <div className="faculty-section">
              <input name="designation" value={designation} onChange={onChange} placeholder="Designation" />
              <input name="department" value={department} onChange={onChange} placeholder="Department" />
            </div>
          )}

          <button className="btn btn-primary" type="submit">
            {loading ? "Submitting..." : "Register"}
          </button>
        </form>
      )}

      {showOtpInput && (
        <div className="otp-container">
          <h3>Please enter the OTP sent to your email address.</h3>
          <h1 style={{ fontSize: "16px", fontWeight: 400, color: "#666" }}>
            Didn't receive the OTP? Check your spam.
          </h1>
          <input value={otp} onChange={(e) => setOtp(e.target.value)} />

          <button onClick={verifyOtp}>Verify OTP</button>

          <p className="otp-timer">
            {timer > 0 ? `Resend in ${timer}s` : "You can resend"}
          </p>

          <button disabled={!canResend} onClick={resendOtp}>
            Resend OTP
          </button>

          <button className="reset-btn" onClick={resetOtp}>
            Cancel
          </button>
        </div>
      )}

      {pendingApproval && (
        <div className="success-msg">
          OTP Verified! Awaiting admin approval.On approval you will get email , do check your spam email folder.
        </div>
      )}

      <p className="my-1">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
};

Register.propTypes = {
  setAlert: PropTypes.func.isRequired,
  register: PropTypes.func.isRequired,
  closeSideNav: PropTypes.func.isRequired,
};

export default connect(null, { setAlert, register, closeSideNav })(Register);