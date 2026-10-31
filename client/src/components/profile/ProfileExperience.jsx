import React from "react";
import PropTypes from "prop-types";
import Moment from "react-moment";

const s = {
  entry: {
    paddingTop: "12px",
    paddingBottom: "12px",
    borderBottom: "0.5px solid #E6F1FB",
  },
  entryLast: {
    paddingTop: "12px",
    paddingBottom: "0",
  },
  company: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#111",
  },
  title: {
    fontSize: "13px",
    color: "#185FA5",
    marginTop: "2px",
  },
  date: {
    fontSize: "12px",
    color: "#999",
    marginTop: "2px",
  },
  location: {
    fontSize: "13px",
    color: "#555",
    marginTop: "2px",
  },
  desc: {
    fontSize: "13px",
    color: "#555",
    marginTop: "4px",
    lineHeight: "1.6",
  },
};

const ProfileExperience = ({
  experience: { company, title, location, current, from, to, description },
  isLast,
}) => {
  return (
    <div style={isLast ? s.entryLast : s.entry}>
      <div style={s.company}>{company}</div>
      <div style={s.title}>{title}</div>
      <div style={s.date}>
        <Moment format="MMM YYYY">{from}</Moment>
        {" – "}
        {current ? "Present" : <Moment format="MMM YYYY">{to}</Moment>}
      </div>
      {location && <div style={s.location}>{location}</div>}
      {description && <div style={s.desc}>{description}</div>}
    </div>
  );
};

ProfileExperience.propTypes = {
  experience: PropTypes.object.isRequired,
  isLast: PropTypes.bool,
};

ProfileExperience.defaultProps = {
  isLast: false,
};

export default ProfileExperience;