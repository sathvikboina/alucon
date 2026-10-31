import axios from "axios";
import { useState } from "react";
import { Link } from "react-router-dom";
import "./createJob.css";

const Job = () => {
  let userData = JSON.parse(localStorage.getItem("_user_data"));

  const userID = userData._id;
  const userName = userData.name;
  const userRole = userData.role;

  const [job_name, set_job_name] = useState("");
  const [job_description, set_job_description] = useState("");
  const [job_link, set_job_link] = useState("");
  const [job_deadline, set_job_deadline] = useState("");
  const [job_type, set_job_type] = useState("Internship");
  const [work_mode, set_work_mode] = useState("Remote");
  const [location, set_location] = useState("");
  const [skills, setSkills] = useState("");
  const [eligible_programs, setEligiblePrograms] = useState("");
  const [eligible_graduation_years, setEligibleGraduationYears] = useState("");
  const [loading, setLoading] = useState(false);

  const createJob = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formdata = {
        username: userName,
        userID,
        job_name,
        description: job_description,
        link: job_link,
        job_deadline,
        job_type,
        work_mode,
        location,
        skills,
        requirements: skills,
        eligible_programs,
        eligible_graduation_years,
      };

      await axios.post(`/api/job/create-job`, formdata);

      window.location.reload(false);
    } catch (err) {
      console.error("Job creation failed", err);
      setLoading(false);
    }
  };

  return (
    <div className="create-job-page">
      
      {/* Back Button */}
      <div className="back-btn-container">
        <Link to="/jobs" className="back-btn">
          ← Go Back
        </Link>
      </div>

      {/* Form */}
      {userRole !== "student" ? (
        <form className="job-form" onSubmit={createJob}>
          <h2>Create New Job Post</h2>

          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              placeholder="Enter job title"
              onChange={(e) => set_job_name(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              placeholder="Enter job description"
              onChange={(e) => set_job_description(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Type</label>
              <select value={job_type} onChange={(e) => set_job_type(e.target.value)}>
                <option>Internship</option>
                <option>Project</option>
                <option>Research</option>
                <option>Referral</option>
                <option>Full-time</option>
              </select>
            </div>
            <div className="form-group">
              <label>Work mode</label>
              <select value={work_mode} onChange={(e) => set_work_mode(e.target.value)}>
                <option>Remote</option>
                <option>Hybrid</option>
                <option>Onsite</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              placeholder="e.g. Bengaluru, India or Remote"
              value={location}
              onChange={(e) => set_location(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Skills / requirements</label>
            <input
              type="text"
              placeholder="Python, Machine Learning, SQL (comma separated)"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
            />
            <small className="form-text">
              Used by matching. The description is also scanned for skills.
            </small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Eligible programs (optional)</label>
              <input
                type="text"
                placeholder="B.Tech IT, B.Tech ECE"
                value={eligible_programs}
                onChange={(e) => setEligiblePrograms(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Graduation years (optional)</label>
              <input
                type="text"
                placeholder="2026, 2027"
                value={eligible_graduation_years}
                onChange={(e) => setEligibleGraduationYears(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Application Link</label>
            <input
              type="text"
              placeholder="Enter link"
              onChange={(e) => set_job_link(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Deadline</label>
            <input
              type="date"
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => set_job_deadline(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Creating..." : "Submit"}
          </button>
        </form>
      ) : (
        <h3 className="no-access">Students cannot create jobs</h3>
      )}
    </div>
  );
};

export default Job;