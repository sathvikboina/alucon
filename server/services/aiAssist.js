// Bounded AI assists (F-56).
//
// Exactly two click-only assists live here:
//   1. draft a message for an existing Open Door request
//   2. extract editable profile fields from a CV / LinkedIn paste
//
// Rules:
//  - Nothing is auto-sent or auto-saved. The API only returns text/fields.
//  - Model output is whitelisted and length-limited before it reaches the UI.
//  - Without a model key, a deterministic offline template is returned and
//    labelled model: "offline".
//  - Pasted CV text is never stored or logged.

const Door = require("../models/Door");
const mongoose = require("mongoose");
const { generateJSON } = require("./aiService");

const MAX_DOOR_MESSAGE = 1200;
const MAX_HINT = 500;
const MIN_PROFILE_TEXT = 80;
const MAX_PROFILE_TEXT = 12000;

class AssistError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "AssistError";
    this.status = status;
  }
}

const text = (value, max) => {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
};

const list = (value, maxItems, maxLength) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => text(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
};

const firstName = (name) =>
  String(name || "").trim().split(/\s+/)[0] || "there";

const truncate = (value, max) =>
  String(value || "").length > max
    ? `${String(value).slice(0, max - 1).trimEnd()}…`
    : String(value || "");

/* ------------------------------------------------------------------ */
/* Door request draft                                                  */
/* ------------------------------------------------------------------ */

function fallbackDoorMessage(door, requester, hint = "") {
  const owner = firstName(door.owner?.name);
  const name = requester?.name || "an IIITA student";
  const program = requester?.program ? ` (${requester.program})` : "";
  const topics = (door.topics || []).filter(Boolean).slice(0, 3);
  const topicLine = topics.length
    ? ` I am especially interested in ${topics.join(", ")}.`
    : "";
  const hintLine = hint ? ` ${truncate(hint, 300)}` : "";

  return truncate(
    `Hi ${owner}, I'm ${name}${program}. I'd like to request “${door.title}” through Open Doors.${hintLine}${topicLine} Thank you for considering it.`,
    MAX_DOOR_MESSAGE
  );
}

function doorPrompt(door, requester, hint) {
  const payload = {
    door: {
      title: door.title,
      type: door.type,
      topics: (door.topics || []).slice(0, 6),
      ownerName: door.owner?.name || "an alumnus",
      ownerRole: door.owner?.designation || "",
      ownerOrganisation: door.owner?.organisation || "",
    },
    requester: {
      name: requester?.name || "",
      program: requester?.program || "",
      passingYear: requester?.passing_year || "",
      skills: (requester?.skills || []).slice(0, 8),
      goals: (requester?.mentee_goals || []).slice(0, 5),
    },
    hint: truncate(hint, 400),
  };

  return `Write a short, polite request message for the Open Doors request below.

Rules:
- Use only the details provided. Do not invent achievements, employers or promises.
- Address the door owner by first name.
- State the specific ask, why it matters, and thank them once.
- Keep it under 120 words; no subject line, markdown or emoji.
- Return strict JSON only: {"message":""}

REQUEST:
${JSON.stringify(payload)}`;
}

function normalizeDoorDraft(aiData, door, requester, hint) {
  const generated = text(aiData?.message, MAX_DOOR_MESSAGE);
  if (generated.length < 40) {
    return { message: fallbackDoorMessage(door, requester, hint), valid: false };
  }
  return { message: generated, valid: true };
}

async function draftDoorRequest(
  { doorId, requester, hint = "" },
  { generate = generateJSON } = {}
) {
  if (!requester) throw new AssistError(401, "Authentication required");
  if (String(requester.role || "").toLowerCase() !== "student") {
    throw new AssistError(403, "Only students can request a door slot");
  }
  if (!doorId || !mongoose.Types.ObjectId.isValid(String(doorId))) {
    throw new AssistError(404, "Door not found or inactive");
  }

  const door = await Door.findById(doorId)
    .populate("owner", "name role designation organisation")
    .lean();
  if (!door || !door.active) {
    throw new AssistError(404, "Door not found or inactive");
  }
  if (String(door.owner?._id || door.owner) === String(requester._id)) {
    throw new AssistError(400, "You cannot request your own door");
  }

  const safeHint = text(hint, MAX_HINT);
  let ai = null;
  try {
    ai = await generate(doorPrompt(door, requester, safeHint), {
      maxOutputTokens: 500,
      temperature: 0.3,
    });
  } catch (err) {
    ai = null;
  }

  const normalized = normalizeDoorDraft(ai?.data, door, requester, safeHint);
  const usedModel = Boolean(ai?.data && normalized.valid);

  return {
    message: normalized.message,
    model: usedModel ? ai.model : "offline",
    fallback: !usedModel,
    door: {
      id: String(door._id),
      title: door.title,
      type: door.type,
      topics: (door.topics || []).slice(0, 6),
    },
    // Kept explicit so the UI can say the request is still a draft.
    autoSent: false,
  };
}

/* ------------------------------------------------------------------ */
/* CV / LinkedIn profile import                                        */
/* ------------------------------------------------------------------ */

const EMPTY_PROFILE_FIELDS = () => ({
  bio: "",
  skills: [],
  location: "",
  organisation: "",
  status: "",
  website: "",
  githubusername: "",
  social: {},
  mentee_goals: [],
  internship_types: [],
  internship_work_modes: [],
  internship_locations: [],
});

function sectionAfter(textValue, headingPattern) {
  const match = String(textValue || "").match(headingPattern);
  if (!match) return "";
  const rest = String(textValue).slice(match.index + match[0].length);
  const stop = rest.search(/\n\s*\n|\n[A-Z][A-Z /&-]{2,}\s*:?\s*\n/);
  return (stop >= 0 ? rest.slice(0, stop) : rest).trim();
}

function fallbackProfileFields(profileText) {
  const fields = EMPTY_PROFILE_FIELDS();
  const raw = String(profileText || "");

  const skillsSection = sectionAfter(raw, /(?:^|\n)\s*skills?\s*[:\-]\s*/i);
  const skillSource = skillsSection || raw;
  const skillMatches = skillSource
    .split(/[\n,;|•·]+/)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter((item) => item.length >= 2 && item.length <= 40);
  fields.skills = [...new Set(skillMatches)].slice(0, 20);

  const locationMatch = raw.match(
    /(?:^|\n)\s*(?:location|based in|city)\s*[:\-]\s*(.+)/i
  );
  if (locationMatch) fields.location = text(locationMatch[1], 120);

  const linkedinMatch = raw.match(
    /https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i
  );
  if (linkedinMatch) fields.social.linkedin = text(linkedinMatch[0], 200);

  const summary = sectionAfter(
    raw,
    /(?:^|\n)\s*(?:summary|profile|about)\s*[:\-]\s*/i
  );
  if (summary) fields.bio = text(summary, 800);

  const experienceLine = sectionAfter(
    raw,
    /(?:^|\n)\s*(?:experience|work experience)\s*[:\-]\s*/i
  )
    .split(/\n+/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean)[0];
  if (experienceLine) {
    const at = experienceLine.split(/\s+at\s+/i);
    if (at.length === 2) {
      fields.status = text(at[0], 80);
      fields.organisation = text(at[1], 120);
    } else {
      fields.status = text(experienceLine, 80);
    }
  }

  return fields;
}

function profilePrompt(profileText) {
  return `Extract profile fields from the CV or LinkedIn text below.

Rules:
- Use only text that appears below. Do not invent skills, employers, dates or links.
- Omit anything you cannot find; use "" or [] for missing values.
- skills: up to 20 short skills.
- bio: a neutral first-person summary of at most 700 characters.
- mentee_goals, internship_types, internship_work_modes and internship_locations: short lists only when explicitly stated.
- social: only linkedin, twitter, facebook, instagram or youtube URLs found in the text.
- Return strict JSON only:
{"bio":"","skills":[],"location":"","organisation":"","status":"","website":"","githubusername":"","social":{},"mentee_goals":[],"internship_types":[],"internship_work_modes":[],"internship_locations":[]}

TEXT:
${truncate(profileText, MAX_PROFILE_TEXT)}`;
}

function normalizeProfileFields(aiData) {
  const fields = EMPTY_PROFILE_FIELDS();
  if (!aiData || typeof aiData !== "object") return fields;

  fields.bio = text(aiData.bio, 800);
  fields.skills = list(aiData.skills, 20, 40);
  fields.location = text(aiData.location, 120);
  fields.organisation = text(aiData.organisation, 120);
  fields.status = text(aiData.status, 80);
  fields.website = text(aiData.website, 200);
  fields.githubusername = text(aiData.githubusername, 80);
  fields.mentee_goals = list(aiData.mentee_goals, 8, 80);
  fields.internship_types = list(aiData.internship_types, 8, 40);
  fields.internship_work_modes = list(aiData.internship_work_modes, 8, 40);
  fields.internship_locations = list(aiData.internship_locations, 8, 80);

  const social = aiData.social && typeof aiData.social === "object"
    ? aiData.social
    : {};
  for (const key of ["linkedin", "twitter", "facebook", "instagram", "youtube"]) {
    const value = text(social[key], 200);
    if (value) fields.social[key] = value;
  }

  return fields;
}

function countFields(fields) {
  let count = 0;
  for (const value of Object.values(fields)) {
    if (Array.isArray(value)) {
      if (value.length) count += 1;
    } else if (value && typeof value === "object") {
      if (Object.keys(value).length) count += 1;
    } else if (value) {
      count += 1;
    }
  }
  return count;
}

async function importProfileText(
  { profileText },
  { generate = generateJSON } = {}
) {
  const raw = String(profileText || "").trim();
  if (raw.length < MIN_PROFILE_TEXT) {
    throw new AssistError(
      400,
      `Paste at least ${MIN_PROFILE_TEXT} characters of CV or LinkedIn text`
    );
  }
  if (raw.length > MAX_PROFILE_TEXT) {
    throw new AssistError(400, "Pasted text is too long");
  }

  let ai = null;
  try {
    ai = await generate(profilePrompt(raw), {
      maxOutputTokens: 1000,
      temperature: 0.1,
    });
  } catch (err) {
    ai = null;
  }

  let fields = normalizeProfileFields(ai?.data);
  let usedModel = true;
  if (countFields(fields) === 0) {
    fields = fallbackProfileFields(raw);
    usedModel = false;
  }
  if (countFields(fields) === 0) {
    throw new AssistError(400, "Could not find profile fields in that text");
  }

  return {
    fields,
    fieldCount: countFields(fields),
    model: usedModel && ai?.data ? ai.model : "offline",
    fallback: !(usedModel && ai?.data),
    stored: false,
  };
}

module.exports = {
  MAX_DOOR_MESSAGE,
  MAX_HINT,
  MIN_PROFILE_TEXT,
  MAX_PROFILE_TEXT,
  AssistError,
  fallbackDoorMessage,
  fallbackProfileFields,
  normalizeDoorDraft,
  normalizeProfileFields,
  countFields,
  draftDoorRequest,
  importProfileText,
};
