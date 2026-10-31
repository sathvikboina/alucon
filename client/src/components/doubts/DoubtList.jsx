import React, { useState, useEffect } from "react";
import AnswerForm from "./AnswerForm";
import axios from "axios";
import "./DoubtList.css";

const DoubtList = () => {
  const [doubts, setDoubts] = useState([]);
  const [answers, setAnswers] = useState({});
  const [searchName, setSearchName] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // 🔥 Popup state
  const [popup, setPopup] = useState({ show: false, message: "" });

  // 🔥 Current user
  const user = JSON.parse(localStorage.getItem("_user_data"));
  const currentUserId = user?._id;

  useEffect(() => {
    fetchDoubts();
  }, []);

  const fetchDoubts = async () => {
    try {
      const res = await axios.get(`/api/doubts`);
      setDoubts(res.data);

      const allAnswers = {};
      for (const doubt of res.data) {
        const ansRes = await axios.get(`/api/doubts/${doubt._id}/answers`);
        allAnswers[doubt._id] = ansRes.data;
      }
      setAnswers(allAnswers);
    } catch (err) {
      console.error(err);
    }
  };

  // 🔥 Updated Upvote Function
  const upvote = async (id) => {
    try {
      const res = await axios.post(`/api/doubts/${id}/upvote`);

      // update UI without full reload
      setDoubts((prev) =>
        prev.map((d) => (d._id === id ? res.data : d))
      );

      setPopup({ show: true, message: "Upvoted successfully ✅" });
    } catch (err) {
      if (err.response && err.response.status === 400) {
        setPopup({ show: true, message: "You already upvoted this doubt ❌" });
      } else {
        console.error(err);
      }
    }

    // auto hide popup
    setTimeout(() => {
      setPopup({ show: false, message: "" });
    }, 2000);
  };

  const search = searchName.toLowerCase();

  const filteredDoubts = doubts.filter((doubt) => {
    const name = doubt.user?.name?.toLowerCase() || "";
    const nameMatch = name.includes(search);
    const categoryMatch =
      !filterCategory || doubt.category === filterCategory;

    return nameMatch && categoryMatch;
  });

  return (
    <div className="doubt-room-wrapper">

      {/* 🔔 Popup */}
      {popup.show && (
        <div className="popup-message">
          {popup.message}
        </div>
      )}

      {/* 🔍 Filters */}
      <div className="doubt-filters">
        <input
          type="text"
          placeholder="Search by name..."
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
        />

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="General">General</option>
          <option value="Career">Career</option>
          <option value="Higher Studies">Higher Studies</option>
          <option value="Placements">Placements</option>
          <option value="Entrepreneurship">Entrepreneurship</option>
          <option value="Projects">Projects</option>
        </select>
      </div>

      {/* 🤔 Doubts */}
      <div className="doubt-list">
        {filteredDoubts.length > 0 ? (
          filteredDoubts.map((doubt) => {
            const alreadyUpvoted = doubt.upvotedBy?.includes(currentUserId);

            return (
              <div className="doubt-card" key={doubt._id}>
                
                <div className="doubt-header">
                  <div className="doubt-meta">
                    <>
                      <img 
                        src={(doubt.user?.avatar || "").replace('d=mm', 'd=404')} 
                        alt="avatar" 
                        className="doubt-avatar" 
                        onError={(e) => {
                          e.target.style.display = 'none';
                          if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                      <div className="doubt-avatar" style={{ display: 'none', background: "#eff6ff", alignItems: "center", justifyContent: "center", color: "#60a5fa", border: "1px solid #d8dde6" }}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="60%" height="60%">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                      </div>
                    </>

                    <div>
                      <h4 className="doubt-question">
                        {doubt.question}
                      </h4>

                      <p className="doubt-info">
                        <span className="doubt-user">
                          {doubt.user?.name || "Unknown User"}
                        </span>{" "}
                        •{" "}
                        <span className="doubt-category">
                          {doubt.category}
                        </span>
                      </p>
                    </div>
                  </div>

                  <button
                    className="btn-upvote"
                    onClick={() => upvote(doubt._id)}
                    disabled={alreadyUpvoted}
                  >
                    {alreadyUpvoted ? "✔ Upvoted" : "⬆ Upvote"} ({doubt.upvotes})
                  </button>
                </div>

                {/* 💬 Answers */}
                {answers[doubt._id]?.length > 0 && (
                  <div className="answer-list">
                    {answers[doubt._id].map((ans, idx) => (
                      <div key={idx} className="answer-item">
                        <p>{ans.answer}</p>
                        <small>
                          —{" "}
                          <strong>
                            {ans.answeredBy?.name || "Unknown"}
                          </strong>{" "}
                          at{" "}
                          {new Date(ans.createdAt).toLocaleString()}
                        </small>
                      </div>
                    ))}
                  </div>
                )}

                <AnswerForm
                  doubtId={doubt._id}
                  refresh={fetchDoubts}
                />
              </div>
            );
          })
        ) : (
          <p className="no-doubts">No doubts found</p>
        )}
      </div>
    </div>
  );
};

export default DoubtList;