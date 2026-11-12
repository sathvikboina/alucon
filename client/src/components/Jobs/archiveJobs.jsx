import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  const [ArchiveJobData, setArchiveJobData] = useState([]);

  useEffect(() => {
    const getData = async () => {
      const data = await axios.get(`/api/job/get/getjob`);
      setArchiveJobData(data.data.archive.reverse());
    };

    getData();
  }, []);

  let userData = localStorage.getItem("_user_data");
  userData = JSON.parse(userData);

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
      window.location.reload(false);
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

      <div className="row" style={{ minHeight: "80vh", padding: "0 8%", margin: 0, justifyContent: "flex-start" }}>
      {ArchiveJobData.map((ele) => (
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
              created at - {ele.Job_post_date.slice(0, 10)}
            </p>
          </div>

          <h3 style={{ margin: "8px 0" }}>{ele.Job_name}</h3>
          <p style={{ margin: "6px 0" }}>{ele.Description}</p>
          <p style={{ margin: "6px 0" }}>
            Deadline - {ele.Job_deadline.slice(0, 10)}
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
    </div>
  );
};

export default Job;
