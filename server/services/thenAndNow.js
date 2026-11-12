// "Then & Now" panel for BATCH groups (F-55).
//
// The panel is read-only and uses existing collections only. City counts include
// only members with show_city === true, and reconnect prompts only include
// current batch members who share another group with the viewer. Ordering is
// deterministic; no model is involved.

const Group = require("../models/Group");

const MODEL_LABEL = "algorithm";
const MAX_RECONNECT_PROMPTS = 6;
const MAX_SHARED_GROUP_NAMES = 2;

const idOf = (value) => String(value && value._id ? value._id : value || "");

function cityOf(location) {
  const raw = String(location || "").trim();
  if (!raw) return "";
  // Keep the aggregate city-level only: "Bengaluru, India" -> "Bengaluru".
  return raw.split(",")[0].split("/")[0].trim().slice(0, 80);
}

function emptyPanel() {
  return {
    enabled: false,
    readOnly: true,
    model: MODEL_LABEL,
    cityOptIn: false,
    cityCounts: [],
    reconnect: [],
  };
}

function buildCityCounts(members) {
  const byCity = new Map();
  let optedIn = 0;

  for (const member of members) {
    if (!member || member.blocked === true || member.show_city !== true) continue;
    const city = cityOf(member.location);
    if (!city) continue;

    optedIn += 1;
    const key = city.toLowerCase();
    const entry = byCity.get(key);
    if (entry) {
      entry.count += 1;
    } else {
      byCity.set(key, { city, count: 1 });
    }
  }

  const cityCounts = [...byCity.values()].sort(
    (a, b) => b.count - a.count || a.city.localeCompare(b.city)
  );

  return { cityCounts, optedIn };
}

function reconnectView(member, sharedGroups, sharedGroupCount, viewer) {
  const sameCity =
    viewer &&
    viewer.show_city === true &&
    member.show_city === true &&
    cityOf(viewer.location) &&
    cityOf(viewer.location).toLowerCase() === cityOf(member.location).toLowerCase();

  return {
    id: idOf(member._id),
    name: member.name || "IIITA member",
    avatar: member.avatar || "",
    role: member.role || "",
    program: member.program || "",
    passing_year: member.passing_year || "",
    designation: member.designation || "",
    organisation: member.organisation || "",
    // City is exposed only when the member opted in.
    city: member.show_city === true ? cityOf(member.location) : "",
    sameCity: Boolean(sameCity),
    sharedGroups: sharedGroups.slice(0, MAX_SHARED_GROUP_NAMES),
    sharedGroupCount,
  };
}

async function buildThenAndNow({ group, viewerId } = {}) {
  if (!group || group.category !== "BATCH") return emptyPanel();

  const members = (group.members || [])
    .map((entry) => entry.user)
    .filter((member) => member && member._id);
  const memberById = new Map(members.map((member) => [idOf(member._id), member]));
  const viewer = memberById.get(String(viewerId || "")) || null;
  const { cityCounts, optedIn } = buildCityCounts(members);

  const panel = {
    ...emptyPanel(),
    enabled: true,
    cityOptIn: Boolean(viewer && viewer.show_city === true),
    cityCounts,
    cityOptInCount: optedIn,
  };

  // Reconnect prompts are personal and only make sense for members of this batch.
  if (!viewer) return panel;

  const sharedGroups = await Group.find({
    _id: { $ne: group._id },
    "members.user": viewerId,
  })
    .select("name members.user")
    .lean();

  const byCandidate = new Map();
  for (const sharedGroup of sharedGroups) {
    for (const entry of sharedGroup.members || []) {
      const candidateId = idOf(entry.user);
      if (!candidateId || candidateId === String(viewerId)) continue;
      if (!memberById.has(candidateId)) continue;

      if (!byCandidate.has(candidateId)) {
        byCandidate.set(candidateId, { names: [], count: 0 });
      }
      const bucket = byCandidate.get(candidateId);
      const name = sharedGroup.name || "Shared group";
      if (!bucket.names.includes(name)) bucket.names.push(name);
      bucket.count += 1;
    }
  }

  const reconnect = [];
  for (const [candidateId, bucket] of byCandidate) {
    const member = memberById.get(candidateId);
    if (!member || member.blocked === true) continue;
    reconnect.push(
      reconnectView(member, bucket.names, bucket.count, viewer)
    );
  }

  reconnect.sort(
    (a, b) =>
      b.sameCity - a.sameCity ||
      b.sharedGroupCount - a.sharedGroupCount ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id)
  );

  panel.reconnect = reconnect.slice(0, MAX_RECONNECT_PROMPTS);
  return panel;
}

module.exports = {
  MODEL_LABEL,
  MAX_RECONNECT_PROMPTS,
  MAX_SHARED_GROUP_NAMES,
  cityOf,
  buildThenAndNow,
};
