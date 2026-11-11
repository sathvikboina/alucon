import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import api from "../../utils/api";
import "./groups.css";

const FILTERS = [
  { key: "ALL", label: "All Groups" },
  { key: "BATCH", label: "Batch Groups" },
  { key: "PROGRAMME", label: "Degree Programmes" },
  { key: "CLUB", label: "Societies & Clubs" },
  { key: "CHAPTER", label: "Regional Chapters" },
  { key: "COHORT", label: "Application Cohorts" },
  { key: "INVITE", label: "Invite-Only" },
];

const CATEGORY_OPTIONS = [
  { value: "CLUB", label: "Student Society / Technical Club" },
  { value: "BATCH", label: "Graduating Batch Community" },
  { value: "PROGRAMME", label: "Academic Programme / Department" },
  { value: "CHAPTER", label: "Regional Alumni Chapter" },
  { value: "COHORT", label: "Opportunity Application Cohort" },
  { value: "INVITE", label: "Invite-Only Working Group" },
];

const ACCESS_OPTIONS = [
  { value: "OPEN", label: "Open — any verified member can join" },
  { value: "REQUEST", label: "Request to join — owner approves" },
  { value: "INVITE", label: "Invite only — hidden from joining" },
];

const badgeClass = (category) => `group-badge ${String(category || "").toLowerCase()}`;

const EMPTY_FORM = {
  name: "",
  category: "CLUB",
  access: "OPEN",
  description: "",
  guidelines: "",
};

const Groups = () => {
  const history = useHistory();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/api/groups");
      setGroups(data.groups || []);
    } catch (err) {
      setError(err?.response?.data?.msg || "Could not load community hubs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return groups.filter((group) => {
      if (filter !== "ALL" && group.category !== filter) return false;
      if (!term) return true;
      return `${group.name} ${group.description}`.toLowerCase().includes(term);
    });
  }, [groups, filter, search]);

  const myGroups = useMemo(
    () => groups.filter((group) => group.isMember),
    [groups]
  );

  const counts = useMemo(() => {
    const map = { ALL: groups.length };
    groups.forEach((group) => {
      map[group.category] = (map[group.category] || 0) + 1;
    });
    return map;
  }, [groups]);

  const join = async (group) => {
    setBusyId(group._id);
    setError("");
    setNotice("");
    try {
      const { data } = await api.post(`/api/groups/${group._id}/join`, {});
      await loadGroups();
      if (data.status === "pending") {
        setNotice(`Request sent to ${group.name}. The owner will review it.`);
      }
    } catch (err) {
      setError(err?.response?.data?.msg || "Could not join this group.");
    } finally {
      setBusyId("");
    }
  };

  const leave = async (group) => {
    if (!window.confirm(`Leave “${group.name}”?`)) return;
    setBusyId(group._id);
    setError("");
    setNotice("");
    try {
      await api.post(`/api/groups/${group._id}/leave`, {});
      await loadGroups();
    } catch (err) {
      setError(err?.response?.data?.msg || "Could not leave this group.");
    } finally {
      setBusyId("");
    }
  };

  const createGroup = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { data } = await api.post("/api/groups", form);
      setForm(EMPTY_FORM);
      setCreateOpen(false);
      await loadGroups();
      if (data?.group?._id) history.push(`/groups/${data.group._id}`);
    } catch (err) {
      setError(err?.response?.data?.msg || "Could not create the group.");
    } finally {
      setSaving(false);
    }
  };

  const actionFor = (group) => {
    if (group.isOwner) {
      return <span className="group-owner-tag">Owner</span>;
    }
    if (group.isMember) {
      return (
        <button
          type="button"
          className="group-btn subtle"
          disabled={busyId === group._id}
          onClick={() => leave(group)}
        >
          Joined ✓
        </button>
      );
    }
    if (group.pendingRequest) {
      return (
        <button type="button" className="group-btn subtle" disabled>
          Request pending
        </button>
      );
    }
    if (group.access === "INVITE") {
      return (
        <button type="button" className="group-btn subtle" disabled>
          Invite only
        </button>
      );
    }
    return (
      <button
        type="button"
        className="group-btn primary"
        disabled={busyId === group._id}
        onClick={() => join(group)}
      >
        {busyId === group._id
          ? "Working…"
          : group.access === "REQUEST"
          ? "Request"
          : "Join Hub"}
      </button>
    );
  };

  return (
    <div className="groups-page">
      <header className="groups-topbar">
        <div>
          <h1>Groups &amp; Cohorts</h1>
          <span>
            Batches, academic programmes, technical societies and regional
            alumni circles
          </span>
        </div>
        <button
          type="button"
          className="group-btn primary"
          onClick={() => setCreateOpen(true)}
        >
          + Create Group
        </button>
      </header>

      <section className="groups-hero">
        <div>
          <span className="groups-eyebrow">COMMUNITY HUBS</span>
          <h2>Focused spaces for your specific peers.</h2>
          <p>
            Reconnect with your graduating class, collaborate inside student
            societies, or meet alumni in your city. Groups keep conversations
            relevant and accessible.
          </p>
        </div>
        <input
          className="groups-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search hubs…"
          aria-label="Search groups"
        />
      </section>

      <div className="groups-filters" role="tablist" aria-label="Group categories">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={filter === item.key}
            className={`group-tab ${filter === item.key ? "active" : ""}`}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
            <span className="group-tab-count">{counts[item.key] || 0}</span>
          </button>
        ))}
      </div>

      {error && <p className="groups-error">{error}</p>}
      {notice && <p className="groups-notice">{notice}</p>}

      <div className="groups-layout">
        <section className="groups-section">
          {loading ? (
            <p className="groups-empty">Loading community hubs…</p>
          ) : visible.length === 0 ? (
            <p className="groups-empty">
              No hubs match this filter yet. Create one to get started.
            </p>
          ) : (
            <div className="groups-grid">
              {visible.map((group) => (
                <article className="group-card" key={group._id}>
                  <div>
                    <div className="group-card-top">
                      <span className={badgeClass(group.category)}>
                        {group.categoryLabel}
                      </span>
                      <span className="group-access">{group.accessLabel}</span>
                    </div>
                    <h3>{group.name}</h3>
                    <p>{group.description}</p>
                  </div>

                  <div className="group-meta">
                    <div className="member-stack">
                      <div className="avatar-stack">
                        {(group.avatars || []).map((avatar, index) => (
                          <span className="avatar-tiny" key={`${group._id}-${index}`}>
                            {avatar}
                          </span>
                        ))}
                      </div>
                      <span>
                        <strong>{group.membersCount}</strong> member
                        {group.membersCount === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="group-card-actions">
                      <Link
                        to={`/groups/${group._id}`}
                        className="group-btn subtle"
                      >
                        View Hub
                      </Link>
                      {actionFor(group)}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="groups-aside">
          <div className="group-rail-card">
            <h2>Audience &amp; Privacy</h2>
            <div className="group-rail-copy">
              <div>
                <strong>Open Groups</strong>
                <br />
                Any verified student or alumnus can join and participate
                immediately.
              </div>
              <div>
                <strong>Approval Required</strong>
                <br />
                Membership is approved by the group owner or an administrator.
              </div>
              <div>
                <strong>Invite-Only</strong>
                <br />
                Hubs stay visible for discovery, but only invited members can
                enter discussions.
              </div>
            </div>
          </div>

          <div className="group-rail-card">
            <h2>My Active Groups</h2>
            {myGroups.length === 0 ? (
              <p className="group-rail-empty">
                You have not joined any community hubs yet.
              </p>
            ) : (
              <div className="my-groups-list">
                {myGroups.map((group) => (
                  <div className="my-group-row" key={group._id}>
                    <div>
                      <strong>{group.name}</strong>
                      <small>{group.membersCount} members</small>
                    </div>
                    <Link to={`/groups/${group._id}`} className="group-btn tiny">
                      Open
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="group-rail-card muted">
            <h2>How discussions work</h2>
            <p className="group-rail-empty">
              Every hub thread is a real community post, so likes, replies and
              the AI TL;DR keep working. Group threads never appear in the main
              feed or unified search.
            </p>
          </div>
        </aside>
      </div>

      {createOpen && (
        <div
          className="group-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-group-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCreateOpen(false);
          }}
        >
          <form className="group-modal" onSubmit={createGroup}>
            <div className="group-modal-head">
              <div>
                <span className="groups-eyebrow">NEW COMMUNITY HUB</span>
                <h2 id="create-group-title">Create a group</h2>
              </div>
              <button
                type="button"
                className="group-close"
                aria-label="Close"
                onClick={() => setCreateOpen(false)}
              >
                ×
              </button>
            </div>

            <label className="group-field">
              <span>Group name</span>
              <input
                type="text"
                required
                maxLength="80"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="e.g. Competitive Programming Collective"
              />
            </label>

            <div className="group-field-row">
              <label className="group-field">
                <span>Category</span>
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm({ ...form, category: event.target.value })
                  }
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="group-field">
                <span>Membership access</span>
                <select
                  value={form.access}
                  onChange={(event) =>
                    setForm({ ...form, access: event.target.value })
                  }
                >
                  {ACCESS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="group-field">
              <span>Purpose &amp; description</span>
              <textarea
                required
                rows="3"
                maxLength="600"
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="Describe who this group is for and what belongs here."
              />
            </label>

            <label className="group-field">
              <span>Guidelines (optional)</span>
              <textarea
                rows="3"
                maxLength="1200"
                value={form.guidelines}
                onChange={(event) =>
                  setForm({ ...form, guidelines: event.target.value })
                }
                placeholder="Code of conduct, posting rules, moderation notes."
              />
            </label>

            {error && <p className="groups-error">{error}</p>}

            <div className="group-modal-actions">
              <button
                type="button"
                className="group-btn subtle"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="group-btn primary" disabled={saving}>
                {saving ? "Creating…" : "Establish Group"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Groups;
