import React, { useState } from "react";
import PropTypes from "prop-types";
import { Modal, Box } from "@mui/material";
import { connect } from "react-redux";
import { createChannel } from "../../actions/channel";
import "./Settings.css";

const Settings = ({ createChannel }) => {
  const [open, setOpen] = useState(false);
  const [newChannelName, setChannelName] = useState("");

  const handleNewChannelSubmit = () => {
    if (!newChannelName.trim()) return;
    createChannel(newChannelName);
    setChannelName("");
    setOpen(false);
  };

  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 400,
    bgcolor: "#fff",
    borderRadius: "12px",
    boxShadow: 24,
    p: 3,
  };

  return (
    <div className="settings-container">
      <h2 className="settings-title">Admin Settings</h2>

      {/* Create Channel */}
      <div className="settings-card">
        <div className="settings-row">
          <span>Create New Channel</span>
          <button className="btn-create" onClick={() => setOpen(true)}>
            Create
          </button>
        </div>
      </div>

      {/* Modal */}
      <Modal open={open} onClose={() => setOpen(false)}>
        <Box sx={style}>
          <h3>Create Channel</h3>

          <input
            type="text"
            placeholder="Enter channel name"
            value={newChannelName}
            onChange={(e) => setChannelName(e.target.value)}
            className="modal-input"
          />

          <button className="btn-submit" onClick={handleNewChannelSubmit}>
            Submit
          </button>
        </Box>
      </Modal>
    </div>
  );
};

Settings.propTypes = {
  createChannel: PropTypes.func.isRequired,
};

export default connect(null, { createChannel })(Settings);
