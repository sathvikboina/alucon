import React, { useState } from "react";
import axios from "axios";
import "./CreatePoll.css";
const CreatePoll = () => {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [targetRoles, setTargetRoles] = useState(["alumni", "faculty"]);

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post(
        "/api/poll/create",
        {
          question,
          options,
          targetRoles,
        },
        {
          headers: {
            "x-auth-token": localStorage.getItem("token"),
          },
        }
      );

      alert("Poll created successfully!");
      setQuestion("");
      setOptions(["", ""]);
    } catch (err) {
      console.error(err.response?.data);
      alert("Error creating poll");
    }
  };
return (
  <div className="poll-container">
    <h2 className="poll-title">Create Poll</h2>

    <form className="poll-form" onSubmit={handleSubmit}>
      
      {/* Question */}
      <input
        type="text"
        placeholder="Enter question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="poll-input"
      />

      {/* Options */}
      {options.map((opt, index) => (
        <input
          key={index}
          type="text"
          placeholder={`Option ${index + 1}`}
          value={opt}
          onChange={(e) => handleOptionChange(index, e.target.value)}
          className="poll-input"
        />
      ))}

      {/* Add Option */}
      <button
        type="button"
        onClick={addOption}
        className="add-option-btn"
      >
        + Add Option
      </button>

      {/* Submit */}
      <button type="submit" className="submit-btn">
        Create Poll
      </button>
    </form>
  </div>
);
};

export default CreatePoll;