import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import AnswerForm from "./AnswerForm";
import "../detail/DetailPage.css";

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";

const DoubtDetail = () => {
  const { id } = useParams();
  const [doubt, setDoubt] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const user = JSON.parse(localStorage.getItem("_user_data") || "{}");
  const currentUserId = user?._id;

  const fetchAnswers = useCallback(async () => {
    try {
      const { data } = await axios.get(`/api/doubts/${id}/answers`);
      setAnswers(data || []);
    } catch (err) {
      // Keep the question readable even if answers fail to load.
    }
  }, [id]);

  useEffect(() => {
    let alive = true;
    axios
      .get("/api/doubts")
      .then(({ data }) => {
        if (!alive) return;
        setDoubt((data || []).find((item) => item._id === id) || null);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    fetchAnswers();
    return () => {
      alive = false;
    };
  }, [id, fetchAnswers]);

  const upvote = async () => {
    try {
      const { data } = await axios.post(`/api/doubts/${id}/upvote`);
      setDoubt(data);
      setNotice("Upvoted successfully ✅");
    } catch (err) {
      setNotice(
        err?.response?.status === 400
          ? "You already upvoted this doubt ❌"
          : "Could not upvote right now."
      );
    }
    setTimeout(() => setNotice(""), 2500);
  };

  if (loading) {
    return (
      <div className="detail-page">
        <p className="detail-state">Loading discussion…</p>
      </div>
    );
  }

  if (!doubt) {
    return (
      <div className="detail-page">
        <Link to="/doubts" className="detail-back">
          ← Doubt room
        </Link>
        <div className="detail-card">
          <h1 className="detail-title">Discussion not found</h1>
          <p className="detail-body">
            This question may have been removed. Browse the doubt room for open
            discussions.
          </p>
          <div className="detail-actions">
            <Link to="/doubts" className="detail-btn">
              Browse doubts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const alreadyUpvoted = doubt.upvotedBy?.includes(currentUserId);

  return (
    <div className="detail-page">
      <Link to="/doubts" className="detail-back">
        ← Doubt room
      </Link>

      {notice && <div className="detail-notice">{notice}</div>}

      <div className="detail-card">
        <span className="detail-kicker">
          {doubt.category || "General"} · Question
        </span>
        <h1 className="detail-title">{doubt.question}</h1>

        <div className="detail-meta">
          {doubt.user?._id ? (
            <span>
              Asked by{" "}
              <Link to={`/profile/${doubt.user._id}`} className="detail-link">
                {doubt.user.name || "Member"}
              </Link>
            </span>
          ) : (
            <span>Asked by {doubt.user?.name || "Member"}</span>
          )}
          {doubt.createdAt && <span>{fmt(doubt.createdAt)}</span>}
          <span className="detail-chip accent">
            ⬆ {doubt.upvotes || 0} upvotes
          </span>
        </div>

        <div className="detail-actions" style={{ marginTop: 0 }}>
          <button
            type="button"
            className="detail-btn"
            onClick={upvote}
            disabled={alreadyUpvoted}
          >
            {alreadyUpvoted ? "✔ Upvoted" : "⬆ Upvote"}
          </button>
        </div>

        <div className="detail-divider" />
        <h2 style={{ fontSize: 15, color: "#185fa5", margin: "0 0 4px" }}>
          Answers ({answers.length})
        </h2>

        {answers.length === 0 ? (
          <p className="detail-body" style={{ color: "#8595a8" }}>
            No answers yet. Be the first to help.
          </p>
        ) : (
          answers.map((ans, index) => (
            <div className="detail-answer" key={ans._id || index}>
              <p>{ans.answer}</p>
              <small>
                —{" "}
                {ans.answeredBy?._id ? (
                  <Link
                    to={`/profile/${ans.answeredBy._id}`}
                    className="detail-link"
                  >
                    {ans.answeredBy.name || "Member"}
                  </Link>
                ) : (
                  ans.answeredBy?.name || "Unknown"
                )}{" "}
                · {fmt(ans.createdAt)}
              </small>
            </div>
          ))
        )}

        <div className="detail-divider" />
        <AnswerForm doubtId={doubt._id} refresh={fetchAnswers} />
      </div>
    </div>
  );
};

export default DoubtDetail;
