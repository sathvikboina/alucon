import React, { useState } from "react";
import api from "../../utils/api";

const MentorshipButton = ({ receiverId, defaultArea = "Career" }) => {
  const [showForm, setShowForm] = useState(false);
  const [areaOfHelp, setAreaOfHelp] = useState(defaultArea);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const submitRequest = async (e) => {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      await api.post("/api/mentorship", {
        requestedTo: receiverId,
        areaOfHelp,
        message,
      });
      setSuccess(true);
      setShowForm(false);
    } catch (err) {
      setError(err?.response?.data?.msg || "Failed to send request.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <button
        className="btn btn-primary"
        type="button"
        onClick={() => setShowForm(true)}
        disabled={success}
      >
        {success ? "Mentorship requested ✓" : "Request Mentorship"}
      </button>

      {showForm && (
        <div className="card p-3 mt-3" style={{ maxWidth: "430px" }}>
          <h5>Mentorship Request</h5>
          <form onSubmit={submitRequest}>
            <div className="form-group">
              <label>Area of Help</label>
              <select
                className="form-control"
                value={areaOfHelp}
                onChange={(e) => setAreaOfHelp(e.target.value)}
                required
              >
                <option>Career</option>
                <option>Research</option>
                <option>Higher Studies</option>
                <option>Entrepreneurship</option>
                <option>Placements</option>
                <option>Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Message (optional)</label>
              <textarea
                className="form-control"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows="3"
                maxLength="1200"
                placeholder="What would you like help with?"
              />
            </div>
            <button type="submit" className="btn btn-success" disabled={sending}>
              {sending ? "Sending…" : "Send Request"}
            </button>
            <button
              className="btn btn-secondary ml-2"
              onClick={() => setShowForm(false)}
              type="button"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {success && (
        <p className="text-success mt-2">
          Request sent. The mentor will accept or decline it from their dashboard.
        </p>
      )}
      {error && <p className="text-danger mt-2">{error}</p>}
    </div>
  );
};

export default MentorshipButton;
