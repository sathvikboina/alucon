import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../utils/api";

const statusLabel = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  active: "Active",
  completed: "Completed",
};

const MentorDashBoard = () => {
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const [receivedRes, sentRes] = await Promise.all([
        api.get("/api/mentorship/received"),
        api.get("/api/mentorship/sent"),
      ]);
      setReceivedRequests(receivedRes.data);
      setSentRequests(sentRes.data);
      setError("");
    } catch (err) {
      setError(
        err?.response?.data?.msg || "Could not load mentorship requests."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleDecision = async (id, status) => {
    try {
      await api.put(`/api/mentorship/${id}`, { status });
      await fetchRequests();
    } catch (err) {
      setError(err?.response?.data?.msg || "Could not update the request.");
    }
  };

  const renderActions = (request) => {
    if (request.status === "pending") {
      return (
        <div className="mentorship-actions">
          <button
            className="btn btn-success"
            onClick={() => handleDecision(request._id, "accepted")}
          >
            Accept
          </button>
          <button
            className="btn btn-danger"
            onClick={() => handleDecision(request._id, "declined")}
          >
            Decline
          </button>
        </div>
      );
    }
    if (request.status === "accepted") {
      return (
        <button
          className="btn btn-primary"
          onClick={() => handleDecision(request._id, "active")}
        >
          Start mentorship
        </button>
      );
    }
    if (request.status === "active") {
      return (
        <button
          className="btn btn-secondary"
          onClick={() => handleDecision(request._id, "completed")}
        >
          Mark completed
        </button>
      );
    }
    return null;
  };

  return (
    <div className="container mt-4" style={{ paddingBottom: "3rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ marginBottom: "4px" }}>Mentorship Dashboard</h2>
          <p style={{ color: "#667085", margin: 0, fontSize: "13px" }}>
            Request → accept → active → completed. Mentors stay in control of
            every request.
          </p>
        </div>
        <Link className="btn btn-primary" to="/mentor-matches">
          Find a mentor
        </Link>
      </div>

      {error && (
        <div
          style={{
            marginTop: "18px",
            padding: "10px 14px",
            borderRadius: "7px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      <hr />
      <h4>📥 Requests You Received</h4>
      {loading ? (
        <p>Loading requests…</p>
      ) : receivedRequests.length === 0 ? (
        <p>No mentorship requests received yet.</p>
      ) : (
        receivedRequests.map((req) => (
          <div className="card p-3 my-3" key={req._id}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <p style={{ margin: 0 }}>
                <strong>{req.requestedBy?.name || "A member"}</strong> requested
                help in <strong>{req.areaOfHelp}</strong>
              </p>
              <span className={`badge badge-${req.status}`}>
                {statusLabel[req.status] || req.status}
              </span>
            </div>
            {req.message && <p style={{ marginTop: "8px" }}><em>"{req.message}"</em></p>}
            {req.match_score != null && (
              <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#667085" }}>
                Match at request time: <strong>{req.match_score}%</strong>
                {req.match_reasons?.length ? ` · ${req.match_reasons[0]}` : ""}
              </p>
            )}
            <div style={{ marginTop: "10px" }}>{renderActions(req)}</div>
          </div>
        ))
      )}

      <hr />
      <h4>📤 Requests You Sent</h4>
      {loading ? (
        <p>Loading requests…</p>
      ) : sentRequests.length === 0 ? (
        <p>No mentorship requests sent yet.</p>
      ) : (
        sentRequests.map((req) => (
          <div className="card p-3 my-3" key={req._id}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <p style={{ margin: 0 }}>
                You requested help from{" "}
                <strong>{req.requestedTo?.name || "a mentor"}</strong> in{" "}
                <strong>{req.areaOfHelp}</strong>
              </p>
              <span className={`badge badge-${req.status}`}>
                {statusLabel[req.status] || req.status}
              </span>
            </div>
            {req.message && <p style={{ marginTop: "8px" }}><em>"{req.message}"</em></p>}
            {req.match_score != null && (
              <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#667085" }}>
                Match at request time: <strong>{req.match_score}%</strong>
                {req.match_reasons?.length ? ` · ${req.match_reasons[0]}` : ""}
              </p>
            )}
            {["accepted", "active"].includes(req.status) && (
              <button
                className="btn btn-secondary mt-2"
                onClick={() =>
                  handleDecision(req._id, req.status === "accepted" ? "active" : "completed")
                }
              >
                {req.status === "accepted" ? "Start mentorship" : "Mark completed"}
              </button>
            )}
          </div>
        ))
      )}

      <style>{`
        .mentorship-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .badge { padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: capitalize; background: #f1f5f9; color: #475569; }
        .badge-pending { background: #fffbeb; color: #b45309; }
        .badge-accepted { background: #eff6ff; color: #1d4ed8; }
        .badge-active { background: #ecfdf5; color: #047857; }
        .badge-declined { background: #fef2f2; color: #b91c1c; }
        .badge-completed { background: #f1f5f9; color: #475569; }
      `}</style>
    </div>
  );
};

export default MentorDashBoard;
