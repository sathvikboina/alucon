import React, { useState } from "react";
import axios from "axios";
import "./DoubtForm.css";

const DoubtForm = ({ refresh }) => {
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("General");

  const onSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`/api/doubts`, { question, category });
      setQuestion("");
      refresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={onSubmit} className="doubt-form">
      
      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a doubt..."
        required
      />

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option value="General">General</option>
        <option value="Career">Career</option>
        <option value="Higher Studies">Higher Studies</option>
        <option value="Placements">Placements</option>
        <option value="Entrepreneurship">Entrepreneurship</option>
        <option value="Projects">Projects</option>
      </select>

      <button type="submit">Ask</button>

    </form>
  );
};

export default DoubtForm;