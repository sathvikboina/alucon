import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../utils/api";
import "./Doors.css";

const DOOR_TYPES = [
  { value: "chat15", label: "15-minute chat" },
  { value: "resume_review", label: "Resume review" },
  { value: "mock_interview", label: "Mock interview" },
  { value: "referral", label: "Referral" },
  { value: "question", label: "Question" },
];

const TYPE_LABEL = DOOR_TYPES.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

const STATUS_LABEL = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  completed: "Completed",
  cancelled: "Cancelled",
};

const splitTopics = (value) =>
  String(value || "")
    .split(",")
    .map((topic) => topic.trim())
    .filter(Boolean);

const Doors = () => {
  const user = useMemo(
    () => JSON.parse(localStorage.getItem("_user_data") || "{}"),
    []
  );
  const isAlumni = String(user?.role || "").toLowerCase() === "alumni";
  const isStudent = String(user?.role || "").toLowerCase() === "student";

  const [doors, setDoors] = useState([]);
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [typeFilter, setTypeFilter] = useState("");
  const [topicFilter, setTopicFilter] = useState("");

  const [form, setForm] = useState({
    type: "chat15",
    title: "",
    topics: "",
    monthlyCap: 2,
  });
  const [creating, setCreating] = useState(false);

  const [requestingId, setRequestingId] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftLabel, setDraftLabel] = useState("");

  const [question, setQuestion] = useState("");
  const [questionTopics, setQuestionTopics] = useState("");
  const [asking, setAsking] = useState(false);
  const [questionResult, setQuestionResult] = useState(null);

  const [answeringId, setAnsweringId] = useState("");
  const [answerText, setAnswerText] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter) params.type = typeFilter;
      if (topicFilter.trim()) params.topic = topicFilter.trim();

      const calls = [
        api.get("/api/doors", { params }),
        api.get("/api/doors/requests", { params: { scope: "sent" } }),
      ];
      if (isAlumni) {
        calls.push(api.get("/api/doors", { params: { mine: 1 } }));
        calls.push(
          api.get("/api/doors/requests", { params: { scope: "received" } })
        );
      }

      const results = await Promise.all(calls);
      setDoors(results[0].data);
      setSent(results[1].data);
      if (isAlumni) {
        setDoors((current) => {
          const mine = results[2].data;
          const seen = new Set(current.map((door) => door._id));
          return [...current, ...mine.filter((door) => !seen.has(door._id))];
        });
        setReceived(results[3].data);
      } else {
        setReceived([]);
      }
      setError("");
    } catch (err) {
      setError(err?.response?.data?.msg || "Could not load Open Doors.");
    } finally {
      setLoading(false);
    }
  }, [isAlumni, topicFilter, typeFilter]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createDoor = async (event) => {
    event.preventDefault();
    setCreating(true);
    setError("");
    setNotice("");
    try {
      await api.post("/api/doors", {
        type: form.type,
        title: form.title,
        topics: splitTopics(form.topics),
        monthlyCap: Number(form.monthlyCap),
      });
      setForm({ type: "chat15", title: "", topics: "", monthlyCap: 2 });
      setNotice("Door created. It stays inactive until you switch it on.");
      await fetchAll();
    } catch (err) {
      setError(err?.response?.data?.msg || "Could not create the door.");
    } finally {
      setCreating(false);
    }
  };

  const toggleDoor = async (door) => {
    setError("");
    try {
      await api.patch(`/api/doors/${door._id}/active`, {
        active: !door.active,
      });
      await fetchAll();
    } catch (err) {
      setError(err?.response?.data?.msg || "Could not update the door.");
    }
  };

  const draftMessage = async (doorId) => {
    setDrafting(true);
    setError("");
    setNotice("");
    setDraftLabel("");
    try {
      const { data } = await api.post("/api/ai/assist/door-request", {
        doorId,
        hint: requestMessage,
      });
      setRequestMessage(data.message || "");
      setDraftLabel(
        data.fallback
          ? "Draft filled from a fixed template (offline). Edit it before sending."
          : `Draft filled by ${data.model}. Edit it before sending.`
      );
    } catch (err) {
      setError(err?.response?.data?.msg || "Could not draft a message.");
    } finally {
      setDrafting(false);
    }
  };

  const requestDoor = async (doorId) => {
    setRequesting(true);
    setError("");
    setNotice("");
    try {
      await api.post(`/api/doors/${doorId}/request`, {
        message: requestMessage,
      });
      setRequestingId("");
      setRequestMessage("");
      setDraftLabel("");
      setNotice("Request sent. You will see the alumnus's decision here.");
      await fetchAll();
    } catch (err) {
      setError(err?.response?.data?.msg || "Could not send the request.");
    } finally {
      setRequesting(false);
    }
  };

  const transition = async (requestId, status, answer = "") => {
    setError("");
    try {
      await api.put(`/api/doors/requests/${requestId}/transition`, {
        status,
        answerText: answer,
      });
      setAnsweringId("");
      setAnswerText("");
      await fetchAll();
    } catch (err) {
      setError(err?.response?.data?.msg || "Could not update the request.");
    }
  };

  const askQuestion = async (event) => {
    event.preventDefault();
    setAsking(true);
    setError("");
    setQuestionResult(null);
    try {
      const res = await api.post("/api/doors/questions/ask", {
        question,
        topics: splitTopics(questionTopics),
      });
      setQuestionResult(res.data);
      setQuestion("");
      setQuestionTopics("");
      await fetchAll();
    } catch (err) {
      setError(err?.response?.data?.msg || "Could not send the question.");
    } finally {
      setAsking(false);
    }
  };

  const canOpen = isAlumni;
  const canAsk = isStudent;

  return (
    <div className="doors-page">
      <div className="doors-header">
        <div>
          <h2>Open Doors</h2>
          <p>
            A small, capped ask. Students request a slot, alumni accept, then
            the conversation moves to Messenger. No calendar is created.
          </p>
        </div>
        {canOpen && (
          <a href="#create-door" className="doors-header-link">
            Create a door
          </a>
        )}
      </div>

      {error && <div className="doors-alert doors-alert-error">{error}</div>}
      {notice && <div className="doors-alert doors-alert-ok">{notice}</div>}

      {canOpen && (
        <section className="doors-panel" id="create-door">
          <div className="doors-panel-head">
            <h3>Create a door</h3>
            <span className="doors-muted">
              New doors are inactive until you switch them on.
            </span>
          </div>
          <form className="doors-form" onSubmit={createDoor}>
            <label>
              Type
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({ ...current, type: event.target.value }))
                }
              >
                {DOOR_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Title
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="15 minutes on production ML"
                maxLength={120}
                required
              />
            </label>
            <label>
              Topics
              <input
                value={form.topics}
                onChange={(event) =>
                  setForm((current) => ({ ...current, topics: event.target.value }))
                }
                placeholder="Machine Learning, Placements"
              />
            </label>
            <label>
              Monthly cap
              <input
                type="number"
                min={1}
                max={20}
                value={form.monthlyCap}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    monthlyCap: event.target.value,
                  }))
                }
              />
            </label>
            <button className="btn btn-primary" type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create door"}
            </button>
          </form>
        </section>
      )}

      {canAsk && (
        <section className="doors-panel">
          <div className="doors-panel-head">
            <h3>Ask a question through a door</h3>
            <span className="doors-muted">
              Answered questions are checked first with local BGE similarity.
              Matches at or above 0.80 are shown instead of routing a new ask.
            </span>
          </div>
          <form className="doors-question-form" onSubmit={askQuestion}>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="How should I prepare for a production ML interview?"
              rows={3}
              minLength={8}
              maxLength={1000}
              required
            />
            <input
              value={questionTopics}
              onChange={(event) => setQuestionTopics(event.target.value)}
              placeholder="Topics: Machine Learning, Interviews"
            />
            <button className="btn btn-primary" type="submit" disabled={asking}>
              {asking ? "Checking…" : "Ask"}
            </button>
          </form>

          {questionResult?.matched && (
            <div className="doors-result">
              <p className="doors-result-title">
                These answered questions look close. Do they help?
              </p>
              {questionResult.matches.map((match) => (
                <div className="doors-answer" key={match.id}>
                  <div className="doors-answer-head">
                    <strong>{match.question}</strong>
                    <span>{Math.round(match.similarity * 100)}% match</span>
                  </div>
                  <p>{match.answer}</p>
                  <span className="doors-muted">
                    {match.owner?.name || "An alumnus"}
                    {match.owner?.organisation
                      ? ` · ${match.owner.organisation}`
                      : ""}
                  </span>
                </div>
              ))}
            </div>
          )}

          {questionResult && !questionResult.matched && (
            <div className="doors-result">
              {questionResult.routed.length > 0 ? (
                <>
                  <p className="doors-result-title">
                    Sent to {questionResult.routed.length} question door
                    {questionResult.routed.length === 1 ? "" : "s"}.
                  </p>
                  <ul className="doors-routed">
                    {questionResult.routed.map((item) => (
                      <li key={item.id}>
                        {item.doorTitle}
                        {item.owner?.name ? ` · ${item.owner.name}` : ""}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="doors-muted">
                  No answered question was close enough and no opted-in question
                  door matched these topics. Try adding topics or browsing the
                  doors below.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      <section className="doors-panel">
        <div className="doors-panel-head">
          <h3>{isAlumni ? "Your doors and the open directory" : "Open doors"}</h3>
          <div className="doors-filters">
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="">All types</option>
              {DOOR_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <input
              value={topicFilter}
              onChange={(event) => setTopicFilter(event.target.value)}
              placeholder="Filter by topic"
            />
          </div>
        </div>

        {loading ? (
          <p className="doors-muted">Loading doors…</p>
        ) : doors.length === 0 ? (
          <p className="doors-muted">No doors match this filter yet.</p>
        ) : (
          <div className="doors-grid">
            {doors.map((door) => {
              const mine = String(door.owner?._id) === String(user?._id);
              return (
                <article className="doors-card" key={door._id}>
                  <div className="doors-card-top">
                    <span className="doors-type">
                      {TYPE_LABEL[door.type] || door.type}
                    </span>
                    <span
                      className={`doors-state ${
                        door.active ? "is-open" : "is-closed"
                      }`}
                    >
                      {door.active ? "Open" : "Inactive"}
                    </span>
                  </div>
                  <h4>{door.title}</h4>
                  <p className="doors-owner">
                    {door.owner?.name || "Alumnus"}
                    {door.owner?.designation
                      ? ` · ${door.owner.designation}`
                      : ""}
                    {door.owner?.organisation
                      ? ` at ${door.owner.organisation}`
                      : ""}
                  </p>
                  <div className="doors-topics">
                    {(door.topics || []).map((topic) => (
                      <span key={topic}>{topic}</span>
                    ))}
                  </div>
                  <p className="doors-muted">
                    Up to {door.monthlyCap} accepted request
                    {door.monthlyCap === 1 ? "" : "s"} per calendar month.
                  </p>

                  {mine ? (
                    <button
                      className="btn btn-secondary"
                      onClick={() => toggleDoor(door)}
                    >
                      {door.active ? "Switch off" : "Switch on"}
                    </button>
                  ) : canAsk ? (
                    requestingId === door._id ? (
                      <div className="doors-request-box">
                        <textarea
                          value={requestMessage}
                          onChange={(event) =>
                            setRequestMessage(event.target.value)
                          }
                          rows={3}
                          placeholder="What do you want to ask?"
                          maxLength={1200}
                        />
                        {draftLabel && (
                          <p className="doors-muted">{draftLabel}</p>
                        )}
                        <div className="doors-inline-actions">
                          <button
                            className="btn btn-primary"
                            onClick={() => requestDoor(door._id)}
                            disabled={requesting}
                          >
                            {requesting ? "Sending…" : "Send request"}
                          </button>
                          <button
                            className="btn btn-light"
                            onClick={() => draftMessage(door._id)}
                            disabled={drafting || requesting}
                          >
                            {drafting ? "Drafting…" : "Draft a message"}
                          </button>
                          <button
                            className="btn btn-light"
                            onClick={() => {
                              setRequestingId("");
                              setRequestMessage("");
                              setDraftLabel("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          setRequestingId(door._id);
                          setRequestMessage("");
                          setDraftLabel("");
                        }}
                        disabled={!door.active}
                      >
                        Request a slot
                      </button>
                    )
                  ) : (
                    <span className="doors-muted">
                      Only students can request a slot.
                    </span>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {isAlumni && (
        <section className="doors-panel">
          <div className="doors-panel-head">
            <h3>Requests received</h3>
            <span className="doors-muted">
              Accepting consumes one place in the monthly cap.
            </span>
          </div>
          {received.length === 0 ? (
            <p className="doors-muted">No requests yet.</p>
          ) : (
            received.map((request) => (
              <div className="doors-request" key={request._id}>
                <div className="doors-request-head">
                  <strong>{request.requestedBy?.name || "A student"}</strong>
                  <span className={`doors-status is-${request.status}`}>
                    {STATUS_LABEL[request.status] || request.status}
                  </span>
                </div>
                <p className="doors-muted">
                  {request.door?.title} ·{" "}
                  {TYPE_LABEL[request.door?.type] || request.door?.type}
                </p>
                {request.message && <p>{request.message}</p>}
                {request.answerText && (
                  <p className="doors-answer-text">
                    <strong>Answer:</strong> {request.answerText}
                  </p>
                )}
                <div className="doors-inline-actions">
                  {request.status === "pending" && (
                    <>
                      <button
                        className="btn btn-success"
                        onClick={() => transition(request._id, "accepted")}
                      >
                        Accept
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => transition(request._id, "declined")}
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {request.status === "accepted" && (
                    <>
                      {request.door?.type === "question" &&
                      answeringId !== request._id ? (
                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            setAnsweringId(request._id);
                            setAnswerText("");
                          }}
                        >
                          Write answer
                        </button>
                      ) : request.door?.type === "question" ? (
                        <div className="doors-answer-box">
                          <textarea
                            value={answerText}
                            onChange={(event) =>
                              setAnswerText(event.target.value)
                            }
                            rows={4}
                            placeholder="Write the answer that will be reused for similar questions."
                          />
                          <button
                            className="btn btn-primary"
                            onClick={() =>
                              transition(
                                request._id,
                                "completed",
                                answerText
                              )
                            }
                          >
                            Complete with answer
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-secondary"
                          onClick={() => transition(request._id, "completed")}
                        >
                          Mark completed
                        </button>
                      )}
                      <button
                        className="btn btn-light"
                        onClick={() => transition(request._id, "cancelled")}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </section>
      )}

      <section className="doors-panel">
        <div className="doors-panel-head">
          <h3>Requests you sent</h3>
          {isStudent && (
            <span className="doors-muted">
              Meet in Messenger after the alumnus accepts.
            </span>
          )}
        </div>
        {sent.length === 0 ? (
          <p className="doors-muted">No requests sent yet.</p>
        ) : (
          sent.map((request) => (
            <div className="doors-request" key={request._id}>
              <div className="doors-request-head">
                <strong>
                  {request.door?.title || "Door"} ·{" "}
                  {request.door?.owner?.name || "Alumnus"}
                </strong>
                <span className={`doors-status is-${request.status}`}>
                  {STATUS_LABEL[request.status] || request.status}
                </span>
              </div>
              <p className="doors-muted">
                {TYPE_LABEL[request.door?.type] || request.door?.type}
                {request.door?.owner?.organisation
                  ? ` · ${request.door.owner.organisation}`
                  : ""}
              </p>
              {request.message && <p>{request.message}</p>}
              {request.answerText && (
                <p className="doors-answer-text">
                  <strong>Answer:</strong> {request.answerText}
                </p>
              )}
              <div className="doors-inline-actions">
                {request.status === "accepted" && (
                  <Link className="btn btn-primary" to="/messenger">
                    Open Messenger
                  </Link>
                )}
                {["pending", "accepted"].includes(request.status) && (
                  <button
                    className="btn btn-light"
                    onClick={() => transition(request._id, "cancelled")}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
};

export default Doors;
