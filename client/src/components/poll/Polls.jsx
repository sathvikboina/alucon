import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import axios from "axios";
import "./Polls.css";

const Polls = ({ auth: { authUser } }) => {
  const [polls, setPolls] = useState([]);

  const fetchPolls = async () => {
    try {
      const res = await axios.get("/api/poll");
      setPolls(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, []);

  const handleDelete = async (pollId) => {
    if (!window.confirm("Are you sure you want to delete this poll?")) return;
    try {
      await axios.delete(`/api/poll/delete/${pollId}`);
      setPolls(polls.filter((poll) => poll._id !== pollId));
    } catch (err) {
      console.error(err);
      alert("Error deleting poll");
    }
  };

  return (
    <div className="polls-container">
      <h2 className="polls-title">Polling System</h2>

      {polls.length === 0 ? (
        <p className="no-data">No polls available</p>
      ) : (
        polls.map((poll) => (
          <div key={poll._id} className="poll-card">
            <h3 className="poll-question">{poll.question}</h3>

            {poll.options.map((opt, i) => (
              <div className="option-wrapper" key={i}>
                
                <button className="option-btn">
                  <span>{opt.text}</span>

                  <span className="vote-count">
                    ({opt.votes}) - {opt.percentage}%
                  </span>
                </button>

                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${opt.percentage}%` }}
                  ></div>
                </div>

              </div>
            ))}

            {authUser && authUser.isAdmin && (
              <button 
                className="delete-poll-btn" 
                onClick={() => handleDelete(poll._id)}
              >
                Delete Poll
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
};

const mapStateToProps = (state) => ({
  auth: state.auth,
});

export default connect(mapStateToProps)(Polls);