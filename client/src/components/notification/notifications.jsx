import { useEffect, useState, useRef } from "react";
import { useHistory } from "react-router-dom";
import axios from "axios";
import "./temp.css";

const Notifications = () => {
  let userData = localStorage.getItem("_user_data");

  let userID;
  if (userData !== "none") {
    userData = JSON.parse(userData);
    userID = userData?._id;
  }

  const history = useHistory();
  const dropdownRef = useRef();

  const [notifications, setNotifications] = useState([]);
  const [newCount, setNewCount] = useState(0);
  const [open, setOpen] = useState(false);

  // ✅ Fetch notifications
  useEffect(() => {
    const getData = async () => {
      if (userData === "none") return;

      try {
        const res = await axios.post("/api/notifications/getNotifications", {
          userID,
        });

        const data = res.data.notifications || [];
        setNotifications(data);
        setNewCount(res.data.newCount || 0);

      } catch (err) {
        console.error(err);
      }
    };

    getData();
  }, []);

  // ✅ Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Handle click (DELETE + UI UPDATE)
  const handleClick = async (ele) => {
    try {
      await axios.post("/api/notifications/markSingleRead", {
        id: ele._id,
        userID: userID
      });

      // 🔥 REMOVE from UI instead of marking seen
      setNotifications((prev) =>
        prev.filter((item) => item._id !== ele._id)
      );

      // 🔥 update badge count safely
      setNewCount((prev) => (prev > 0 ? prev - 1 : 0));

      // 🔁 redirect
      history.push(ele.Notification_link);

    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="notification-wrapper" ref={dropdownRef}>
      
      {/* 🔔 Bell Button */}
      <div
        className="notification-btn"
        onClick={() => setOpen(!open)}
      >
        🔔
        {newCount > 0 && (
          <span className="notification-badge">{newCount}</span>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="notification-dropdown">
          {notifications.length === 0 ? (
            <div className="no-noti">No notifications</div>
          ) : (
            notifications.map((ele) => (
              <div
                key={ele._id}
                className="notification-item unread"
                onClick={() => handleClick(ele)}
              >
                <span className="new-badge">New</span>

                <div className="noti-text">
                  <strong>{ele.Notification_name}</strong>
                  <p>{ele.Notification_description}</p>
                </div>

                <small className="noti-date">
                  {new Date(ele.createdAt || Date.now()).toLocaleString()}
                </small>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;