import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../utils/api";
import "./Jobs.css";

const fitClass = (score) =>
  score >= 82 ? "strong" : score >= 68 ? "good" : score >= 52 ? "stretch" : "low";

const Job = () => {
  const [jobData, setJobData] = useState([]);
  const [search,  setSearch]  = useState("");
  const [fits, setFits] = useState({});
  const [fitLoading, setFitLoading] = useState("");
  const [fitError, setFitError] = useState("");

  useEffect(() => {
    const getData = async () => {
      const { data } = await api.get("/api/job/get/getjob");
      setJobData([...data.dt].reverse());
    };
    getData();
  }, []);

  const userData = JSON.parse(localStorage.getItem("_user_data"));
  const userID   = userData._id;
  const userName = userData.name;
  const userRole = userData.role;

  const deleteJob = async (e) => {
    e.preventDefault();
    const res = await axios.post(`/api/job/deletejob`, {
      userID,
      userRole,
      jobID: e.target.jobid.value,
    });
    if (res.data.invalid_msg === "invalid") alert("Invalid request.");
    else window.location.reload(false);
  };

  const filtered = jobData.filter((job) =>
    job.Job_name.toLowerCase().includes(search.toLowerCase())
  );

  const checkFit = async (jobId) => {
    setFitError("");
    setFitLoading(jobId);
    try {
      const { data } = await api.get(`/api/ai/insights/jobs/${jobId}/fit`);
      setFits((prev) => ({ ...prev, [jobId]: data }));
    } catch (err) {
      setFitError(
        err?.response?.data?.msg || "Could not assess this role right now."
      );
    } finally {
      setFitLoading("");
    }
  };

  return (
    <div className="jobs-page">

      {/* TOP BAR */}
      <div className="job-top-bar">
        <div className="job-top-bar-title">Job Board</div>
        <div className="job-top-actions">
          {userRole === "student" && (
            <Link className="job-btn-create" to="/internship-matches">
              ✦ My internship matches
            </Link>
          )}
          {userRole !== "student" && (
            <Link className="job-btn-create" to="/createjob">
              + Create Job
            </Link>
          )}
        </div>
      </div>

      {/* SEARCH */}
      <div className="job-search-wrap">
        <input
          type="text"
          placeholder="Search jobs by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="job-search-input"
        />
      </div>

      {fitError && <p className="job-fit-error">{fitError}</p>}

      {/* CARDS GRID */}
      <div className="job-grid">
        {filtered.map((ele) => (
          <div className="job-card" key={ele._id}>

            {/* BODY */}
            <div className="job-card-body">
              <div className="job-card-meta">
                {ele.companyName && ele.companySlug && (
                  <Link
                    to={`/company/${ele.companySlug}`}
                    className="job-company-link"
                  >
                    {ele.companyName}
                  </Link>
                )}
                <a
                  href={`/profile/${ele.userID}`}
                  target="_blank"
                  rel="noreferrer"
                  className="job-posted-by"
                >
                  {ele.created_by_user}
                </a>
                <span className="job-post-date">
                  {ele.Job_post_date.slice(0, 10)}
                </span>
              </div>

              <h3 className="job-title">{ele.Job_name}</h3>
              <div className="job-tag-row">
                {ele.job_type && <span className="job-tag">{ele.job_type}</span>}
                {ele.work_mode && <span className="job-tag subtle">{ele.work_mode}</span>}
                {ele.location && <span className="job-tag subtle">{ele.location}</span>}
              </div>
              <p className="job-desc">{ele.Description}</p>

              <span className="job-deadline-chip">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#b91c1c" strokeWidth="1.5">
                  <rect x="2" y="3" width="12" height="11" rx="1.5"/>
                  <path d="M5 1v4M11 1v4M2 7h12"/>
                </svg>
                Deadline: {ele.Job_deadline.slice(0, 10)}
              </span>

              {fits[ele._id] && (
                <div className={`job-fit-panel ${fitClass(fits[ele._id].score)}`}>
                  <div className="job-fit-head">
                    <span className="job-fit-score">{fits[ele._id].score}%</span>
                    <div>
                      <strong>{fits[ele._id].verdict}</strong>
                      <small>
                        {fits[ele._id].model === "algorithm"
                          ? "Algorithmic assessment"
                          : "Rule-based assessment"}
                      </small>
                    </div>
                  </div>

                  <p className="job-fit-summary">{fits[ele._id].summary}</p>

                  {(fits[ele._id].matchedSkills?.length > 0 ||
                    fits[ele._id].missingSkills?.length > 0) && (
                    <div className="job-fit-chips">
                      {fits[ele._id].matchedSkills.map((skill) => (
                        <span key={skill} className="job-fit-chip matched">
                          ✓ {skill}
                        </span>
                      ))}
                      {fits[ele._id].missingSkills?.map((skill) => (
                        <span key={skill} className="job-fit-chip missing">
                          + {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {fits[ele._id].prepSteps?.length > 0 && (
                    <ul className="job-fit-prep">
                      {fits[ele._id].prepSteps.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="job-card-footer">
              {userRole === "student" && (
                <button
                  type="button"
                  className="job-btn-fit"
                  onClick={() => checkFit(ele._id)}
                  disabled={fitLoading === ele._id}
                >
                  {fitLoading === ele._id
                    ? "Assessing…"
                    : fits[ele._id]
                    ? `✦ ${fits[ele._id].score}% fit`
                    : "✦ Check my fit"}
                </button>
              )}

              {userRole === "student" && (
                <a
                  href={ele.Link}
                  target="_blank"
                  rel="noreferrer"
                  className="job-btn-apply"
                >
                  Apply
                </a>
              )}

              {(ele.created_by_user === userName || userRole === "Admin") && (
                <form onSubmit={deleteJob}>
                  <button
                    type="submit"
                    name="jobid"
                    value={ele._id}
                    className="job-btn-delete"
                  >
                    Delete
                  </button>
                </form>
              )}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};

export default Job;