import React, { useEffect, useState } from "react";
import axios from "axios";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { setAlert } from "../../actions/alert";
import { socket } from "../../socket";
import "./AlumniDirectory.css";

const AVATAR_COLORS = ["av-blue", "av-teal", "av-purple", "av-coral"];

const getAvatarColor = (name = "") => {
  const index = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

const getInitials = (name = "") =>
  name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

const BuildingIcon = () => (
  <svg className="detail-icon" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="4" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.2" />
    <path d="M1 8h14" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

const PinIcon = () => (
  <svg className="detail-icon" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6c0 3.75 4.5 8.5 4.5 8.5S12.5 9.75 12.5 6c0-2.485-2.015-4.5-4.5-4.5z" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

const CheckIcon = () => (
  <svg className="check-icon" viewBox="0 0 16 16" fill="none">
    <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PeopleIcon = () => (
  <svg className="check-icon" viewBox="0 0 16 16" fill="none">
    <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M1 13c0-2.761 2.239-4 5-4s5 1.239 5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M11 7.5c1.5 0 3 .8 3 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="12" cy="4.5" r="1.8" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

const AlumniDirectory = ({ auth: { authUser }, setAlert }) => {
  const [alumni,         setAlumni]         = useState([]);
  const [filters,        setFilters]        = useState({ search: "", batch: "", company: "", domain: "", location: "" });
  const [sentRequests,   setSentRequests]   = useState(new Set());
  const [connectedUsers, setConnectedUsers] = useState(new Set());
  const [loadingIds,     setLoadingIds]     = useState(new Set());

  const fetchAlumni = async () => {
    try {
      const token = localStorage.getItem("token");
      const query = new URLSearchParams(filters).toString();
      const res = await axios.get(`/api/directory/alumni?${query}`, {
        headers: { "x-auth-token": token },
      });
      setAlumni(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFriendStatuses();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAlumni();
    }, 400); // 400ms debounce
    return () => clearTimeout(timer);
  }, [filters]);

  const fetchFriendStatuses = async () => {
    try {
      const res = await axios.get(`/api/friends/status`);
      const pending   = new Set();
      const connected = new Set();
      res.data.forEach(({ userId, status }) => {
        if (status === "pending")  pending.add(userId);
        if (status === "accepted") connected.add(userId);
      });
      setSentRequests(pending);
      setConnectedUsers(connected);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange  = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });
  const handleKeyDown = (e) => {}; // No longer needed, search happens as you type

  const sendFriendRequest = async (receiverId) => {
    if (sentRequests.has(receiverId) || loadingIds.has(receiverId) || connectedUsers.has(receiverId)) return;
    setLoadingIds((prev) => new Set(prev).add(receiverId));
    try {
      await axios.post(`/api/friends/request`, { receiverId });
      if (authUser?._id) socket.emit("sendFriendRequest", { senderId: authUser._id, receiverId });
      setSentRequests((prev) => new Set(prev).add(receiverId));
      setAlert("Connection Request Sent!", "success");
    } catch (err) {
      console.error(err.message);
      setAlert("Error sending connection request", "danger");
    } finally {
      setLoadingIds((prev) => { const u = new Set(prev); u.delete(receiverId); return u; });
    }
  };

  const getConnectButtonState = (userId) => {
    if (connectedUsers.has(userId))
      return { label: "Connected",    disabled: true,  cls: "connect-btn connected", icon: <PeopleIcon /> };
    if (loadingIds.has(userId))
      return { label: "Sending...",   disabled: true,  cls: "connect-btn sending",   icon: null };
    if (sentRequests.has(userId))
      return { label: "Request Sent", disabled: true,  cls: "connect-btn sent",      icon: <CheckIcon /> };
    return   { label: "Connect",      disabled: false, cls: "connect-btn",            icon: null };
  };

  const isSelf = (userId) => authUser && authUser._id === userId;

  return (
    <div className="directory-container">

      {/* Header */}
      <div className="page-header">
        <h1 className="directory-title">Alumni Directory</h1>
        <p className="directory-subtitle">Connect with fellow graduates from your institution</p>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <input type="text" name="search"   placeholder="Search name"  onChange={handleChange} />
        <input type="text" name="batch"    placeholder="Batch year"   onChange={handleChange} />
        <input type="text" name="company"  placeholder="Company"      onChange={handleChange} />
        <input type="text" name="location" placeholder="Location"     onChange={handleChange} />
      </div>

      {/* Results meta */}
      {alumni.length > 0 && (
        <p className="results-meta">Showing {alumni.length} alumni</p>
      )}

      {/* Cards */}
      <div className="cards-grid">
        {alumni.length > 0 ? (
          alumni.map((user) => {
            const self     = isSelf(user._id);
            const btnState = getConnectButtonState(user._id);
            return (
              <div className="alumni-card" key={user._id}>

                <div className="card-top">
                  {user.avatar ? (
                    <>
                      <img 
                        src={user.avatar.replace('d=mm', 'd=404')} 
                        alt={user.name} 
                        className="avatar" 
                        onError={(e) => {
                          e.target.style.display = 'none';
                          if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                      <div className={`avatar-placeholder ${getAvatarColor(user.name)}`} style={{ display: 'none', alignItems: 'center', justifyContent: 'center' }}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="55%" height="55%" style={{ opacity: 0.9 }}>
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                      </div>
                    </>
                  ) : (
                    <div className={`avatar-placeholder ${getAvatarColor(user.name)}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg viewBox="0 0 24 24" fill="currentColor" width="55%" height="55%" style={{ opacity: 0.9 }}>
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                  )}
                  <div className="card-info">
                    <h4>
                      {user.name}
                      {self && <span className="you-badge">You</span>}
                    </h4>
                    <p className="batch">
                      {user.passing_year ? `Batch of ${user.passing_year}` : "Batch N/A"}
                    </p>
                  </div>
                </div>

                <hr className="divider" />

                <div className="card-details">
                  <div className="detail-row">
                    <BuildingIcon />
                    <span className="detail-label">Company</span>
                    <span className="detail-value">{user.organisation || "N/A"}</span>
                  </div>
                  <div className="detail-row">
                    <PinIcon />
                    <span className="detail-label">Location</span>
                    <span className="detail-value">{user.location || "N/A"}</span>
                  </div>
                </div>

                {user.working_area && (
                  <span className="domain-tag">{user.working_area}</span>
                )}

                {!self && (
                  <button
                    className={btnState.cls}
                    disabled={btnState.disabled}
                    onClick={() => sendFriendRequest(user._id)}
                  >
                    {btnState.icon}
                    {btnState.label}
                  </button>
                )}

              </div>
            );
          })
        ) : (
          <p className="no-data">No alumni found</p>
        )}
      </div>
    </div>
  );
};

AlumniDirectory.propTypes = {
  auth:     PropTypes.object.isRequired,
  setAlert: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({ auth: state.auth });

export default connect(mapStateToProps, { setAlert })(AlumniDirectory);