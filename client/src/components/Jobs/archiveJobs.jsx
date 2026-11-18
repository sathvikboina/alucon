import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../utils/api";
import "./Jobs.css";

const cardStyle = {
  width: "35%",
  minWidth: 280,
  margin: 15,
  padding: 16,
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
};

const Job = () => {
  const [archiveJobs, setArchiveJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const getData = async () => {
      try {
        const { data } = await api.get("/api/job/get/getjob");
        if (!cancelled) {
          setArchiveJobs([...(data.archive || [])].reverse());
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.msg ||
              "Could not load archived jobs. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    getData();
    return () => {
      cancelled = true;
    };
  }, []);

  let userData = localStorage.getItem("_user_data");
  userData = JSON.parse(userData || "{}");

  const userID = userData._id;
  const userName = userData.name;
  const userRole = userData.role;

  const deleteJob = async (e) => {
    e.preventDefault();
    const senddata = {
      userID: userID,
      userRole: userRole,
      jobID: e.target.jobid.value,
    };
    const data = await axios.post(`/api/job/deletejob`, senddata);
    if (data.data.invalid_msg === "invalid") {
      alert("invalid");
    } else {
      setArchiveJobs((jobs) =>
        jobs.filter((job) => job._id !== e.target.jobid.value)
      );
    }
  };

  const generateLink = (link) => `/profile/${link}`;

  return (
    <div className="jobs-page">
      <div className="job-top-bar">
        <div className="job-top-bar-left">
          <span className="job-top-kicker">Past Opportunities</span>
          <h1 className="job-top-bar-title">Job Archive</h1>
          <p className="job-top-bar-sub">Browse expired or archived positions from the alumni network</p>
        </div>
        <div className="job-top-actions">
          <Link className="job-btn-create" to="/jobs">
            ← Active Jobs
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="jobs-empty-state">
          <div className="loading-spinner" />
          <p>Loading archived jobs…</p>
        </div>
      ) : error ? (
        <div className="jobs-empty-state">
          <p>{error}</p>
          <Link className="job-btn-create" to="/jobs">
            Back to active jobs
          </Link>
        </div>
      ) : archiveJobs.length === 0 ? (
        <div className="jobs-empty-state">
          <span className="jobs-empty-icon">🗂️</span>
          <h2>No archived jobs yet</h2>
          <p>
            When an opportunity closes it moves here automatically. Active roles
            are still on the main job board.
          </p>
          <Link className="job-btn-create" to="/jobs">
            Browse active jobs
          </Link>
        </div>
      ) : (
        <div className="row" style={{ minHeight: "60vh", padding: "0 8%", margin: 0, justifyContent: "flex-start" }}>
          {archiveJobs.map((ele) => (
            <div key={ele._id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <p style={{ margin: 0 }}>
                  <a
                    style={{ fontWeight: 900 }}
                    href={generateLink(ele.userID)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {ele.created_by_user}
                  </a>
                </p>
                <p style={{ margin: 0, fontSize: 10 }}>
                  created at - {String(ele.Job_post_date || "").slice(0, 10)}
                </p>
              </div>

              <h3 style={{ margin: "8px 0" }}>{ele.Job_name}</h3>
              <p style={{ margin: "6px 0" }}>{ele.Description}</p>
              <p style={{ margin: "6px 0" }}>
                Deadline - {String(ele.Job_deadline || "").slice(0, 10)}
              </p>

              <div
                className="row"
                style={{ display: "flex", justifyContent: "space-evenly" }}
              >
                <div className="col">
                  <p>
                    <a
                      className="btn btn-primary"
                      href={ele.Link}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "white" }}
                    >
                      Apply here
                    </a>
                  </p>
                </div>

                <div className="col">
                  <p>
                    <form onSubmit={(e) => deleteJob(e)}>
                      {ele.created_by_user === userName || userRole === "Admin" ? (
                        <button
                          type="submit"
                          name="jobid"
                          className="btn btn-danger"
                          value={ele._id}
                        >
                          Delete
                        </button>
                      ) : null}
                    </form>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Job;
