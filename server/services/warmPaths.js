// Warm-path finder (F-52).
//
// The graph is deliberately shallow: exactly two hops from the signed-in member
// to an alumnus who currently has an active referral door. Only members with
// connector_opt_in === true may appear anywhere in a result. The score is the
// product of two heuristic edge weights from warmPathWeights.js, and ordering
// is fully deterministic. Nothing here ranks with a model.

const User = require("../models/User");
const Group = require("../models/Group");
const Door = require("../models/Door");
const MentorShipRequest = require("../models/MentorShipRequest");
const Company = require("../models/Company");
const { normalizeCompany, slugifyCompany, companyIndex } = require("./companies");
const {
  EDGE_WEIGHTS,
  MAX_PATH_DEPTH,
  MAX_PATHS,
  FALLBACK_GROUP_LIMIT,
} = require("./warmPathWeights");

const MODEL_LABEL = "algorithm";
const REFERRAL_TYPE = "referral";
const MENTORSHIP_EDGE_STATUSES = ["accepted", "active", "completed"];

const idOf = (value) => String(value && value._id ? value._id : value || "");

function nodeSummary(node, slugIndex) {
  return {
    id: idOf(node._id),
    name: node.name || "IIITA member",
    avatar: node.avatar || "",
    role: node.role || "",
    designation: node.designation || "",
    organisation: node.organisation || "",
    passing_year: node.passing_year || "",
    working_area: node.working_area || "",
    companySlug: slugIndex.get(normalizeCompany(node.organisation)) || "",
  };
}

function buildReason(type, a, b, meta = {}) {
  switch (type) {
    case "mentorship":
      return a.isViewer
        ? `You have a mentorship connection with ${b.name}`
        : `${a.name} and ${b.name} have a mentorship connection`;
    case "mutualFollow":
      return a.isViewer
        ? `You and ${b.name} follow each other`
        : `${a.name} and ${b.name} follow each other`;
    case "oneWayFollow":
      if (a.isViewer) return `You follow ${b.name}`;
      if (b.isViewer) return `${a.name} follows you`;
      return `${a.name} follows ${b.name}`;
    case "sameCompany":
      return a.isViewer
        ? `You and ${b.name} both work at ${meta.company}`
        : `${a.name} and ${b.name} both work at ${meta.company}`;
    case "sharedGroup":
      return a.isViewer
        ? `You and ${b.name} are both in ${meta.group}`
        : `${a.name} and ${b.name} are both in ${meta.group}`;
    default:
      return a.isViewer
        ? `You and ${b.name} have a connection`
        : `${a.name} and ${b.name} have a connection`;
  }
}

function addEdge(adjacency, nodes, slugIndex, a, b, type, weight, meta) {
  if (!a || !b || a.id === b.id) return;
  if (!nodes.has(b.id)) return;

  const left = { ...a, isViewer: nodes.get(a.id)?.isViewer };
  const right = { ...b, isViewer: nodes.get(b.id)?.isViewer };
  const reason = buildReason(type, left, right, meta);

  if (!adjacency.has(a.id)) adjacency.set(a.id, new Map());
  const neighbours = adjacency.get(a.id);
  const current = neighbours.get(b.id);
  if (!current || weight > current.weight) {
    neighbours.set(b.id, { weight, type, reason, from: a.id, to: b.id });
  }
}

async function buildWarmPaths(viewer) {
  if (!viewer) return null;
  const viewerId = idOf(viewer._id);

  const [optedIn, groups, mentorships, referralDoors, companies] =
    await Promise.all([
      User.find({
        connector_opt_in: true,
        role: { $in: [/^alumni$/i, /^faculty$/i] },
      })
        .select(
          "name avatar role designation organisation passing_year working_area followers followings connector_opt_in"
        )
        .lean(),
      Group.find({}).select("name category members").lean(),
      MentorShipRequest.find({ status: { $in: MENTORSHIP_EDGE_STATUSES } })
        .select("requestedBy requestedTo status")
        .lean(),
      Door.find({ active: true, type: REFERRAL_TYPE })
        .select("owner title type topics monthlyCap createdAt")
        .sort({ createdAt: 1, _id: 1 })
        .lean(),
      Company.find().lean(),
    ]);

  const slugIndex = companyIndex(companies);
  const nodes = new Map();
  for (const person of optedIn) nodes.set(idOf(person._id), person);
  // The viewer is a graph node even when they have not opted in; opting in is
  // about being exposed to other members, not about using the finder.
  nodes.set(viewerId, { ...viewer, isViewer: true });

  const optedInIds = new Set(optedIn.map((person) => idOf(person._id)));
  const adjacency = new Map();

  // Follow edges point in the follow direction. A mutual follow is weighted
  // higher than a one-way follow.
  const directedFollows = new Set();
  for (const [nodeId, node] of nodes) {
    for (const followId of node.followings || []) {
      directedFollows.add(`${nodeId}->${idOf(followId)}`);
    }
  }
  for (const pair of directedFollows) {
    const [fromId, toId] = pair.split("->");
    if (!nodes.has(fromId) || !nodes.has(toId)) continue;
    const mutual = directedFollows.has(`${toId}->${fromId}`);
    const from = nodes.get(fromId);
    const to = nodes.get(toId);
    const wid = mutual ? EDGE_WEIGHTS.mutualFollow : EDGE_WEIGHTS.oneWayFollow;
    const type = mutual ? "mutualFollow" : "oneWayFollow";
    addEdge(adjacency, nodes, slugIndex, nodeSummary(from, slugIndex), nodeSummary(to, slugIndex), type, wid);
  }

  for (const request of mentorships) {
    const fromId = idOf(request.requestedBy);
    const toId = idOf(request.requestedTo);
    if (!nodes.has(fromId) || !nodes.has(toId)) continue;
    addEdge(
      adjacency,
      nodes,
      slugIndex,
      nodeSummary(nodes.get(fromId), slugIndex),
      nodeSummary(nodes.get(toId), slugIndex),
      "mentorship",
      EDGE_WEIGHTS.mentorship
    );
  }

  // Same-company edges use the normalised company index, not raw strings.
  const byCompany = new Map();
  for (const [nodeId, node] of nodes) {
    const slug = slugIndex.get(normalizeCompany(node.organisation)) || slugifyCompany(node.organisation);
    if (!slug) continue;
    if (!byCompany.has(slug)) byCompany.set(slug, []);
    byCompany.get(slug).push(nodeId);
  }
  const companyNames = new Map(companies.map((company) => [company.slug, company.name]));
  for (const [slug, memberIds] of byCompany) {
    if (memberIds.length < 2) continue;
    const companyName = companyNames.get(slug) || "the same company";
    for (let i = 0; i < memberIds.length; i++) {
      for (let j = i + 1; j < memberIds.length; j++) {
        const a = nodes.get(memberIds[i]);
        const b = nodes.get(memberIds[j]);
        addEdge(
          adjacency,
          nodes,
          slugIndex,
          nodeSummary(a, slugIndex),
          nodeSummary(b, slugIndex),
          "sameCompany",
          EDGE_WEIGHTS.sameCompany,
          { company: companyName }
        );
        addEdge(
          adjacency,
          nodes,
          slugIndex,
          nodeSummary(b, slugIndex),
          nodeSummary(a, slugIndex),
          "sameCompany",
          EDGE_WEIGHTS.sameCompany,
          { company: companyName }
        );
      }
    }
  }

  // Shared groups connect every pair of opted-in members in the group.
  for (const group of groups) {
    const memberIds = (group.members || [])
      .map((member) => idOf(member.user))
      .filter((memberId) => nodes.has(memberId));
    if (memberIds.length < 2) continue;
    for (let i = 0; i < memberIds.length; i++) {
      for (let j = i + 1; j < memberIds.length; j++) {
        const a = nodes.get(memberIds[i]);
        const b = nodes.get(memberIds[j]);
        addEdge(
          adjacency,
          nodes,
          slugIndex,
          nodeSummary(a, slugIndex),
          nodeSummary(b, slugIndex),
          "sharedGroup",
          EDGE_WEIGHTS.sharedGroup,
          { group: group.name }
        );
        addEdge(
          adjacency,
          nodes,
          slugIndex,
          nodeSummary(b, slugIndex),
          nodeSummary(a, slugIndex),
          "sharedGroup",
          EDGE_WEIGHTS.sharedGroup,
          { group: group.name }
        );
      }
    }
  }

  // Only opted-in alumni can be a referral endpoint.
  const referralByOwner = new Map();
  for (const door of referralDoors) {
    const ownerId = idOf(door.owner);
    if (!optedInIds.has(ownerId)) continue;
    if (!referralByOwner.has(ownerId)) referralByOwner.set(ownerId, door);
  }

  const viewerNeighbours = adjacency.get(viewerId) || new Map();
  const paths = [];
  for (const [connectorId, firstHop] of viewerNeighbours) {
    if (!optedInIds.has(connectorId)) continue;
    const connector = nodes.get(connectorId);
    const secondNeighbours = adjacency.get(connectorId) || new Map();

    for (const [targetId, secondHop] of secondNeighbours) {
      if (targetId === viewerId || targetId === connectorId) continue;
      if (!optedInIds.has(targetId)) continue;

      // A two-hop path is still useful when the viewer already follows the
      // target: the intermediary may have the stronger relationship.
      const door = referralByOwner.get(targetId);
      if (!door) continue;

      const target = nodes.get(targetId);
      paths.push({
        targetId,
        connectorId,
        score: Number((firstHop.weight * secondHop.weight).toFixed(4)),
        connector: nodeSummary(connector, slugIndex),
        target: nodeSummary(target, slugIndex),
        door: {
          id: idOf(door._id),
          title: door.title,
          type: door.type,
          topics: door.topics || [],
          monthlyCap: door.monthlyCap,
        },
        hops: [
          {
            from: nodeSummary(nodes.get(viewerId), slugIndex),
            to: nodeSummary(connector, slugIndex),
            type: firstHop.type,
            weight: firstHop.weight,
            reason: firstHop.reason,
          },
          {
            from: nodeSummary(connector, slugIndex),
            to: nodeSummary(target, slugIndex),
            type: secondHop.type,
            weight: secondHop.weight,
            reason: secondHop.reason,
          },
        ],
      });
    }
  }

  paths.sort(
    (a, b) =>
      b.score - a.score ||
      a.connector.name.localeCompare(b.connector.name) ||
      a.target.name.localeCompare(b.target.name) ||
      a.targetId.localeCompare(b.targetId) ||
      a.connectorId.localeCompare(b.connectorId)
  );

  // Keep the best path per target, then the top three overall.
  const seenTargets = new Set();
  const topPaths = [];
  for (const path of paths) {
    if (seenTargets.has(path.targetId)) continue;
    seenTargets.add(path.targetId);
    topPaths.push({
      ...path,
      model: MODEL_LABEL,
      askThrough: "referral_door",
    });
    if (topPaths.length >= MAX_PATHS) break;
  }

  // Fallback: suggest the viewer's groups that already contain opted-in alumni
  // who could introduce a path later.
  const fallbackGroups = [];
  if (!topPaths.length) {
    for (const group of groups) {
      const memberIds = (group.members || []).map((member) => idOf(member.user));
      if (!memberIds.includes(viewerId)) continue;
      const optedInMembers = memberIds.filter((memberId) => optedInIds.has(memberId));
      const referralOwners = optedInMembers.filter((memberId) => referralByOwner.has(memberId));
      if (!optedInMembers.length) continue;
      fallbackGroups.push({
        id: idOf(group._id),
        name: group.name,
        category: group.category,
        memberCount: memberIds.length,
        optedInMembers: optedInMembers.length,
        referralOwners: referralOwners.length,
      });
    }
    fallbackGroups.sort(
      (a, b) =>
        b.referralOwners - a.referralOwners ||
        b.optedInMembers - a.optedInMembers ||
        a.name.localeCompare(b.name) ||
        a.id.localeCompare(b.id)
    );
  }

  return {
    model: MODEL_LABEL,
    depth: MAX_PATH_DEPTH,
    optedIn: Boolean(viewer.connector_opt_in),
    paths: topPaths,
    fallback: {
      groups: fallbackGroups.slice(0, FALLBACK_GROUP_LIMIT),
    },
    summary: topPaths.length
      ? `${topPaths.length} two-hop ${
          topPaths.length === 1 ? "path" : "paths"
        } to an active referral door.`
      : "No two-hop path to an active referral door yet. A shared group is the fastest way to create one.",
  };
}

module.exports = {
  MODEL_LABEL,
  REFERRAL_TYPE,
  MENTORSHIP_EDGE_STATUSES,
  buildWarmPaths,
};
