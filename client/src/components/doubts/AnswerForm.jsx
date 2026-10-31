import React, { useState } from "react";
import axios from "axios";
import "./AnswerForm.css";

const AnswerForm = ({ doubtId, refresh }) => {
  const [answer, setAnswer] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`/api/doubts/${doubtId}/answer`, { answer });
      setAnswer("");
      refresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={onSubmit} className="answer-form">
      
      <input
        type="text"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Write your answer..."
        required
      />

      <button type="submit">Answer</button>

    </form>
  );
};

export default AnswerForm;