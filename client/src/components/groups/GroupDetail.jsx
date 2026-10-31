import React, { useCallback, useEffect, useState } from "react";
import { Link, useHistory, useParams } from "react-router-dom";
import api from "../../utils/api";
import PostCard from "../posts/PostCard";
import "./groups.css";

const badgeClass = (category) =>
  `group-badge ${String(category || "").toLowerCase()}`;

const escapeHtml = (value = "") =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");

const roleLabel = (member) => {
  if (member.memberRole === "owner") return "Owner";
  const bits = [];
  if (member.role) bits.push(member.role);
  if (member.program) bits.push(member.program);
  if (member.passing_year) bits.push(`Class of ${member.passing_year}`);
  if (member.organisation) bits.push(member.organisation);
  return bits.join(" · ") || "IIITA member";
};

const GroupDetail = () => {
  const { id } = useParams();
  const history = useHistory();
  const [group, setGroup] = useState(null);
  const [discussions, setDiscussions] = useState([]);
  const [locked, setLocked] = useState(false);
  const [tab, setTab] = useState("discussions");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState({ heading: "", text: "" });
  const [inviteEmail, setInviteEmail] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/api/groups/${id}`);
      setGroup(data.group);
      setLocked(!data.group.canViewDiscussions);

      if (data.group.canViewDiscussions) {
        const result = await api.get(`/api/groups/${id}/discussions`);
        setDiscussions(result.data.discussions || []);
        setLocked(Boolean(result.data.locked));
      } else {
        setDiscussions([]);
      }
    } catch (err) {
      setError(err?.response?.data?.msg || "Could not load this group.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const join = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.post(`/api/groups/${id}/join`, {});
      await load();
      if (data.status === "pending") {
        setNotice("Request sent. The group owner will review it.");
      }
    } catch (err) {
      setError(err?.response?.data?.msg || "Could not join this group.");
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    if (!window.confirm(`Leave “${group.name}”?`)) return;
    setBusy(true);
    setError("");
    try {
      await api.post(`/api/groups/${id}/leave`, {});
      await load();
    } catch (err) {
      setError(err?.response?.data?.msg || "Could not leave this group.");
    } finally {
      setBusy(false);
    }
  };

  const decideRequest = async (requestId, action) => {
    setBusy(true);
    setError("");
    try {
      await api.post(`/api/groups/${id}/requests/${requestId}`, { action });
      await load();
    } catch (err) {
      setError(err?.response?.data?.msg || "Could not update that request.");
    } finally {
      setBusy(false);
    }
  };

  const invite = async (event) => {
    event.preventDefault();
    if (!inviteEmail.trim()) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.post(`/api/groups/${id}/invite`, {
        email: inviteEmail.trim(),
      });
      setInviteEmail("");
      setNotice(`Invited ${data.invited?.name || "member"}.`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.msg || "Could not send that invite.");
    } finally {
      setBusy(false);
    }
  };

  const startDiscussion = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post(`/api/groups/${id}/discussions`, {
        heading: draft.heading.trim(),
        text: escapeHtml(draft.text.trim()),
      });
      setDraft({ heading: "", text: "" });
      const result = await api.get(`/api/groups/${id}/discussions`);
      const next = result.data.discussions || [];
      setDiscussions(next);
      setGroup((current) =>
        current ? { ...current, discussionsCount: next.length } : current
      );
    } catch (err) {
      setError(err?.response?.data?.msg || "Could not start that discussion.");
    } finally {
      setBusy(false);
    }
  };

  const removeGroup = async () => {
    if (
      !window.confirm(
        `Delete “${group.name}” and all of its discussions? This cannot be undone.`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await api.delete(`/api/groups/${id}`);
      history.push("/groups");
    } catch (err) {
      setError(err?.response?.data?.msg || "Could not delete this group.");
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="groups-page">
        <p className="groups-empty">Loading hub…</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="groups-page">
        <p className="groups-empty">{error || "Group not found."}</p>
        <Link to="/groups" className="group-btn subtle">
          Back to Groups
        </Link>
      </div>
    );
  }

  const canParticipate = group.isMember || group.isOwner || group.canManage;

  return (
    <div className="groups-page">
      <div className="group-detail-shell">
        <div className="group-detail-breadcrumb">
          <Link to="/groups">← Groups &amp; Cohorts</Link>
          <span>{group.categoryLabel}</span>
        </div>

        <header className="group-detail-hero">
          <div className="group-detail-identity">
            <div className="group-detail-avatar">
              {group.initials || "II"}
            </div>
            <div>
              <div className="group-detail-badges">
                <span className={badgeClass(group.category)}>
                  {group.categoryLabel}
                </span>
                <span className="group-access">{group.accessLabel}</span>
              </div>
              <h1>{group.name}</h1>
              <p>
                <strong>{group.membersCount}</strong> member
                {group.membersCount === 1 ? "" : "s"} ·{" "}
                {group.discussionsCount || 0} discussion
                {group.discussionsCount === 1 ? "" : "s"}
                {group.owner?.name ? ` · Led by ${group.owner.name}` : ""}
              </p>
            </div>
          </div>

          <div className="group-detail-actions">
            {group.isOwner && <span className="group-owner-tag">Owner</span>}
            {!group.isOwner && group.isMember && (
              <button
                type="button"
                className="group-btn subtle"
                disabled={busy}
                onClick={leave}
              >
                Joined ✓ · Leave
              </button>
            )}
            {!group.isMember && !group.isOwner && (
              <>
                {group.pendingRequest ? (
                  <button type="button" className="group-btn subtle" disabled>
                    Request pending
                  </button>
                ) : group.access === "INVITE" && !group.invited ? (
                  <button type="button" className="group-btn subtle" disabled>
                    Invite only
                  </button>
                ) : (
                  <button
                    type="button"
                    className="group-btn primary"
                    disabled={busy}
                    onClick={join}
                  >
                    {group.access === "REQUEST" && !group.invited
                      ? "Request to join"
                      : "Join Hub"}
                  </button>
                )}
              </>
            )}
            {group.canManage && (
              <button
                type="button"
                className="group-btn danger"
                disabled={busy}
                onClick={removeGroup}
              >
                Delete
              </button>
            )}
          </div>
        </header>

        <p className="group-detail-description">{group.description}</p>

        {error && <p className="groups-error">{error}</p>}
        {notice && <p className="groups-notice">{notice}</p>}

        <nav className="group-tabs-nav" role="tablist">
          {[
            ["discussions", `Discussions (${group.discussionsCount || 0})`],
            ["members", `Members (${group.membersCount || 0})`],
            ["guidelines", "Guidelines & Rules"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`group-detail-tab ${tab === key ? "active" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
          {group.canManage && (
            <button
              type="button"
              role="tab"
              aria-selected={tab === "manage"}
              className={`group-detail-tab ${tab === "manage" ? "active" : ""}`}
              onClick={() => setTab("manage")}
            >
              Manage
              {(group.requests || []).length > 0
                ? ` (${group.requests.length})`
                : ""}
            </button>
          )}
        </nav>

        {tab === "discussions" && (
          <section className="group-panel">
            {locked ? (
              <div className="group-locked">
                <strong>This hub keeps its discussions private.</strong>
                <p>
                  Join the group to read and start threads. Members-only posts
                  never appear in the main feed.
                </p>
              </div>
            ) : (
              <>
                {canParticipate && (
                  <form className="group-composer" onSubmit={startDiscussion}>
                    <input
                      type="text"
                      required
                      maxLength="160"
                      placeholder="Discussion title"
                      value={draft.heading}
                      onChange={(event) =>
                        setDraft({ ...draft, heading: event.target.value })
                      }
                    />
                    <textarea
                      required
                      rows="3"
                      placeholder="Share an update, ask the cohort a question, or post a resource…"
                      value={draft.text}
                      onChange={(event) =>
                        setDraft({ ...draft, text: event.target.value })
                      }
                    />
                    <div className="group-composer-actions">
                      <span>Visible only to members of this hub.</span>
                      <button
                        type="submit"
                        className="group-btn primary"
                        disabled={busy}
                      >
                        {busy ? "Posting…" : "Start discussion"}
                      </button>
                    </div>
                  </form>
                )}

                {discussions.length === 0 ? (
                  <p className="groups-empty">
                    No discussion threads in this cohort yet. Be the first to
                    start one.
                  </p>
                ) : (
                  <div className="group-discussions">
                    {discussions.map((post) => (
                      <PostCard key={post._id} post={post} />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {tab === "members" && (
          <section className="group-panel">
            {locked ? (
              <p className="groups-empty">
                The member list is visible to members only.
              </p>
            ) : (group.members || []).length === 0 ? (
              <p className="groups-empty">No members to show yet.</p>
            ) : (
              <div className="group-members">
                {group.members.map((member) => (
                  <div className="group-member-item" key={member._id}>
                    <div className="group-member-identity">
                      <span className="group-member-avatar">
                        {(member.name || "II")
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")
                          .toUpperCase()}
                      </span>
                      <div>
                        <strong>{member.name}</strong>
                        <span>{roleLabel(member)}</span>
                      </div>
                    </div>
                    <Link
                      to={`/profile/${member._id}`}
                      className="group-btn tiny"
                    >
                      Profile
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "guidelines" && (
          <section className="group-panel group-guidelines">
            <h2>Code of conduct</h2>
            {group.guidelines ? (
              <p>{group.guidelines}</p>
            ) : (
              <p>
                Keep discussions professional and source-grounded. Batch
                updates, project threads and job leads must respect IIITA
                privacy standards.
              </p>
            )}
            <h2>Moderation</h2>
            <p>
              Reported content is routed to the institutional governance
              console. Group owners can approve requests, invite members and
              remove the hub.
            </p>
            <h2>Visibility</h2>
            <p>
              Threads in this hub are real community posts. They are excluded
              from the main feed, the “For you” ranker and the weekly AI
              briefing, and are readable only by members.
            </p>
          </section>
        )}

        {tab === "manage" && group.canManage && (
          <section className="group-panel group-manage">
            <div className="group-manage-block">
              <h2>Pending join requests</h2>
              {(group.requests || []).length === 0 ? (
                <p className="groups-empty">No pending requests.</p>
              ) : (
                group.requests.map((request) => (
                  <div className="group-request-row" key={request._id}>
                    <div>
                      <strong>{request.user?.name || "Member"}</strong>
                      <span>
                        {request.user?.email || ""}
                        {request.message ? ` · “${request.message}”` : ""}
                      </span>
                    </div>
                    <div className="group-request-actions">
                      <button
                        type="button"
                        className="group-btn tiny"
                        disabled={busy}
                        onClick={() => decideRequest(request._id, "approve")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="group-btn tiny danger"
                        disabled={busy}
                        onClick={() => decideRequest(request._id, "reject")}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="group-manage-block">
              <h2>Invite a member</h2>
              <form className="group-invite-form" onSubmit={invite}>
                <input
                  type="email"
                  required
                  placeholder="member@iiita.ac.in"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                />
                <button
                  type="submit"
                  className="group-btn primary"
                  disabled={busy}
                >
                  Send invite
                </button>
              </form>
              {(group.invites || []).length > 0 && (
                <p className="group-invite-list">
                  Invited:{" "}
                  {group.invites
                    .map((entry) => entry.user?.name || entry.user?.email)
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default GroupDetail;
