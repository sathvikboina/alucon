import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../utils/api";
import "./WarmPaths.css";

const WarmPaths = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/warm-paths");
      setData(response.data);
    } catch (err) {
      setError(err?.response?.data?.msg || "Could not load warm paths.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleOptIn = async () => {
    if (!data) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api.patch("/api/warm-paths/opt-in", { optIn: !data.optedIn });
      setNotice(
        data.optedIn
          ? "You are now opted out. You will not appear in anyone's warm paths."
          : "You are opted in. You can now appear as a connector or referral endpoint."
      );
      await load();
    } catch (err) {
      setError(err?.response?.data?.msg || "Could not update the opt-in.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="warm-page">
      <div className="warm-header">
        <div>
          <h2>Warm Paths</h2>
          <p>
            Two hops, no more. The finder shows how you already know someone
            who can introduce you to an alumnus with an active referral door.
            The ask always goes through that door, never a direct message.
          </p>
        </div>
        <Link className="warm-back" to="/doors">
          Open Doors
        </Link>
      </div>

      {error && <div className="warm-alert error">{error}</div>}
      {notice && <div className="warm-alert ok">{notice}</div>}

      <section className="warm-panel warm-optin">
        <div>
          <h3>Connector opt-in</h3>
          <p className="warm-muted">
            Off by default. While off you can use the finder, but your name never
            appears in another member's path. Switching on only exposes your
            name, current role and company to signed-in members, never your
            contact details.
          </p>
        </div>
        <button
          className={`warm-toggle ${data?.optedIn ? "is-on" : ""}`}
          onClick={toggleOptIn}
          disabled={saving || loading || !data}
        >
          {saving ? "Saving…" : data?.optedIn ? "Opted in" : "Opted out"}
        </button>
      </section>

      {loading ? (
        <p className="warm-muted">Finding paths…</p>
      ) : data?.paths?.length ? (
        <>
          <div className="warm-summary">
            <span>{data.summary}</span>
            <span className="warm-chip">model: algorithm</span>
            <span className="warm-chip">depth: {data.depth}</span>
          </div>

          <div className="warm-list">
            {data.paths.map((path) => (
              <article className="warm-card" key={path.targetId}>
                <div className="warm-chain">
                  <span className="warm-person you">You</span>
                  <span className="warm-arrow">→</span>
                  <Link
                    className="warm-person"
                    to={`/profile/${path.connector.id}`}
                  >
                    {path.connector.name}
                  </Link>
                  <span className="warm-arrow">→</span>
                  <Link
                    className="warm-person target"
                    to={`/profile/${path.target.id}`}
                  >
                    {path.target.name}
                  </Link>
                  <span className="warm-score">
                    {Math.round(path.score * 100)}% path score
                  </span>
                </div>

                <p className="warm-target-role">
                  {path.target.designation || "Alumnus"}
                  {path.target.organisation
                    ? ` · ${path.target.organisation}`
                    : ""}
                  {path.target.passing_year
                    ? ` · Batch of ${path.target.passing_year}`
                    : ""}
                </p>

                <ol className="warm-hops">
                  {path.hops.map((hop, index) => (
                    <li key={`${path.targetId}-hop-${index}`}>
                      <strong>{hop.reason}</strong>
                      <span className="warm-hop-weight">
                        edge weight {hop.weight}
                      </span>
                    </li>
                  ))}
                </ol>

                <div className="warm-door">
                  <div>
                    <span className="warm-chip door">Referral door</span>
                    <strong>{path.door.title}</strong>
                    <small>
                      Up to {path.door.monthlyCap} accepted request
                      {path.door.monthlyCap === 1 ? "" : "s"} per month.
                    </small>
                  </div>
                  <Link className="warm-action" to="/doors">
                    Request through this door
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <section className="warm-panel">
          <h3>No two-hop path yet</h3>
          <p className="warm-muted">{data?.summary}</p>

          {data?.fallback?.groups?.length ? (
            <div className="warm-groups">
              {data.fallback.groups.map((group) => (
                <Link
                  className="warm-group"
                  key={group.id}
                  to={`/groups/${group.id}`}
                >
                  <strong>{group.name}</strong>
                  <small>
                    {group.optedInMembers} opted-in member
                    {group.optedInMembers === 1 ? "" : "s"} ·{" "}
                    {group.referralOwners} referral door
                    {group.referralOwners === 1 ? "" : "s"}
                  </small>
                </Link>
              ))}
            </div>
          ) : (
            <p className="warm-muted">
              Join a group or connect with an opted-in alumnus to create a path.
            </p>
          )}
        </section>
      )}
    </div>
  );
};

export default WarmPaths;
