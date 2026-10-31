import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./PollAnalytics.css";

const COLORS = ["#1a2a4a", "#3b82f6", "#6366f1", "#10b981", "#f59e0b"];

const PollAnalytics = () => {
  const [data, setData] = useState([]);

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get("/api/poll/analytics", {
        headers: {
          "x-auth-token": localStorage.getItem("token"),
        },
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="analytics-container">
      <h2 className="analytics-title">
        Poll Analytics Dashboard
      </h2>

      {data.map((poll) => {
        const maxVotes = Math.max(...poll.options.map(o => o.votes));

        return (
          <div key={poll._id} className="analytics-card">
            <h3 className="analytics-question">
              {poll.question}
            </h3>

            <p className="analytics-total">
              Total Votes: <b>{poll.totalVotes}</b>
            </p>

            <div className="analytics-content">
              
              {/* PIE CHART */}
              <div className="analytics-chart">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={poll.options}
                      dataKey="votes"
                      nameKey="text"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {poll.options.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* LIST */}
              <div className="analytics-list">
                {poll.options.map((opt, i) => {
                  const isTop = opt.votes === maxVotes && maxVotes > 0;

                  return (
                    <div key={i} className="analytics-option">
                      
                      <div
                        className={`analytics-option-header ${
                          isTop ? "top" : ""
                        }`}
                      >
                        <span>{opt.text}</span>
                        <span>
                          {opt.votes} ({opt.percentage}%)
                        </span>
                      </div>

                      {/* PROGRESS */}
                      <div className="progress-bar">
                        <div
                          className={`progress-fill ${
                            isTop ? "top-fill" : ""
                          }`}
                          style={{ width: `${opt.percentage}%` }}
                        ></div>
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PollAnalytics;