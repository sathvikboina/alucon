import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Modal, Box } from "@mui/material";
import { connect } from "react-redux";
import {
  setRequirePostApproval,
  getRequirePostApproval,
} from "../../actions/post";
import { createChannel } from "../../actions/channel";
import "./Settings.css";

const Settings = ({
  setRequirePostApproval,
  getRequirePostApproval,
  createChannel,
  post: {
    settings: { requireApproval },
  },
}) => {
  const [postApproval, setPostApproval] = useState(requireApproval);
  const [open, setOpen] = useState(false);
  const [newChannelName, setChannelName] = useState("");

  useEffect(() => {
    getRequirePostApproval();
  }, []);

  useEffect(() => {
    setPostApproval(requireApproval);
  }, [requireApproval]);

  const handleToggle = async () => {
    await setRequirePostApproval(!postApproval);
    setPostApproval(!postApproval);
  };

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

      {/* Post Approval Toggle */}
      {/* <div className="settings-card">
        <div className="settings-row">
          <span>Require Approval for Posts</span>

          <label className="switch">
            <input
              type="checkbox"
              checked={postApproval}
              onChange={handleToggle}
            />
            <span className="slider round"></span>
          </label>
        </div>
      </div> */}

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
  setRequirePostApproval: PropTypes.func.isRequired,
  getRequirePostApproval: PropTypes.func.isRequired,
  post: PropTypes.object.isRequired,
  createChannel: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  post: state.post,
});

export default connect(mapStateToProps, {
  setRequirePostApproval,
  getRequirePostApproval,
  createChannel,
})(Settings);