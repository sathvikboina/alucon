const express = require("express");
const mongoose = require("mongoose");
const Filter = require("bad-words");

const auth = require("../../middleware/auth");
const Group = require("../../models/Group");
const Post = require("../../models/Post");
const User = require("../../models/User");
const { canViewPost } = require("../../utils/postVisibility");
const {
  queueSearchRefresh,
  removeSearchDocument,
} = require("../../services/searchIndex");

const router = express.Router();
const profanity = new Filter();

const CATEGORY_LABELS = {
  BATCH: "Graduating batch",
  PROGRAMME: "Degree programme",
  CLUB: "Society / club",
  CHAPTER: "Regional chapter",
  COHORT: "Application cohort",
  INVITE: "Invite-only hub",
};

const ACCESS_LABELS = {
  OPEN: "Open to all verified members",
  REQUEST: "Approval required",
  INVITE: "Invite only",
};

const idOf = (value) =>
  String(value && value._id ? value._id : value || "");

const initialsOf = (name = "") =>
  String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "II";

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function currentUser(req) {
  return User.findById(req.user.id)
    .select("name email avatar role isAdmin program passing_year designation organisation")
    .lean();
}

function memberOf(group, userId) {
  return (group.members || []).find(
    (member) => idOf(member.user) === String(userId)
  );
}

function pendingRequestOf(group, userId) {
  return (group.joinRequests || []).find(
    (request) =>
      idOf(request.user) === String(userId) && request.status === "pending"
  );
}

function invitedUser(group, userId) {
  return (group.invites || []).find(
    (invite) => idOf(invite.user) === String(userId)
  );
}

function isOwner(group, userId) {
  return idOf(group.owner) === String(userId);
}

function canManage(group, user) {
  return Boolean(user?.isAdmin || isOwner(group, user?._id));
}

function canViewDiscussions(group, user) {
  if (!user) return false;
  if (user.isAdmin) return true;
  if (isOwner(group, user._id)) return true;
  if (memberOf(group, user._id)) return true;
  return group.access === "OPEN";
}

function summary(group, user) {
  const userId = String(user?._id || user?.id || "");
  const member = memberOf(group, userId);
  const pending = pendingRequestOf(group, userId);
  const invited = invitedUser(group, userId);
  const owner = isOwner(group, userId);

  return {
    _id: group._id,
    name: group.name,
    initials: group.initials || initialsOf(group.name),
    description: group.description,
    category: group.category,
    categoryLabel: CATEGORY_LABELS[group.category] || group.category,
    access: group.access,
    accessLabel: ACCESS_LABELS[group.access] || group.access,
    owner: group.owner && group.owner.name
      ? {
          _id: group.owner._id,
          name: group.owner.name,
          avatar: group.owner.avatar,
          role: group.owner.role,
        }
      : group.owner,
    membersCount: (group.members || []).length,
    avatars: (group.members || [])
      .slice(0, 3)
      .map((entry) =>
        initialsOf(entry.user && entry.user.name ? entry.user.name : "II")
      ),
    isMember: Boolean(member),
    memberRole: member ? member.role : null,
    isOwner: owner,
    pendingRequest: Boolean(pending),
    invited: Boolean(invited),
    canJoin:
      !member &&
      (group.access === "OPEN" ||
        group.access === "REQUEST" ||
        Boolean(invited)),
    canLeave: Boolean(member) && !owner,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

function memberView(entry) {
  const user = entry.user || {};
  return {
    _id: user._id || entry.user,
    name: user.name || "IIITA member",
    avatar: user.avatar || "",
    role: user.role || "",
    program: user.program || "",
    passing_year: user.passing_year || "",
    designation: user.designation || "",
    organisation: user.organisation || "",
    memberRole: entry.role,
    joinedAt: entry.joinedAt,
  };
}

// @route   GET api/groups
// @desc    List community hubs, optionally filtered by category or search
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ msg: "User not found" });

    const category = String(req.query.category || "").toUpperCase();
    const search = String(req.query.search || "").trim();

    const query = {};
    if (category && category !== "ALL") query.category = category;
    if (search) {
      const pattern = new RegExp(escapeRegex(search), "i");
      query.$or = [{ name: pattern }, { description: pattern }];
    }

    // The prototype lists invite-only hubs with a disabled action instead of
    // hiding them. Discovery is public; joining is still blocked server-side.
    const groups = await Group.find(query)
      .populate("owner", "name avatar role")
      .populate("members.user", "name avatar")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      groups: groups.map((group) => summary(group, user)),
      total: groups.length,
      categories: Group.CATEGORIES,
    });
  } catch (error) {
    console.error("[groups] list failed:", error.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET api/groups/mine
// @desc    Groups the signed-in member belongs to
// @access  Private
router.get("/mine", auth, async (req, res) => {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ msg: "User not found" });

    const groups = await Group.find({ "members.user": req.user.id })
      .populate("owner", "name avatar role")
      .populate("members.user", "name avatar")
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ groups: groups.map((group) => summary(group, user)) });
  } catch (error) {
    console.error("[groups] mine failed:", error.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST api/groups
// @desc    Create a community hub; the creator becomes the owner
// @access  Private
router.post("/", auth, async (req, res) => {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ msg: "User not found" });

    const name = String(req.body.name || "").trim();
    const description = String(req.body.description || "").trim();
    const guidelines = String(req.body.guidelines || "").trim();
    const category = String(req.body.category || "CLUB").toUpperCase();
    const access = String(req.body.access || "OPEN").toUpperCase();

    if (name.length < 3 || name.length > 80) {
      return res.status(400).json({ msg: "Group name must be 3–80 characters" });
    }
    if (description.length < 10 || description.length > 600) {
      return res
        .status(400)
        .json({ msg: "Description must be 10–600 characters" });
    }
    if (guidelines.length > 1200) {
      return res.status(400).json({ msg: "Guidelines are too long" });
    }
    if (!Group.CATEGORIES.includes(category)) {
      return res.status(400).json({ msg: "Unknown group category" });
    }
    if (!Group.ACCESS.includes(access)) {
      return res.status(400).json({ msg: "Unknown membership access" });
    }
    if (profanity.isProfane(`${name} ${description} ${guidelines}`)) {
      return res.status(400).json({ msg: "Please remove profanity" });
    }

    const duplicate = await Group.findOne({ name }).lean();
    if (duplicate) {
      return res.status(409).json({ msg: "A group with this name already exists" });
    }

    const group = await Group.create({
      name,
      initials: initialsOf(name),
      description,
      guidelines,
      category,
      access,
      owner: req.user.id,
      members: [{ user: req.user.id, role: "owner" }],
    });
    queueSearchRefresh("group", group._id);

    const populated = await Group.findById(group._id)
      .populate("owner", "name avatar role")
      .populate("members.user", "name avatar")
      .lean();

    res.status(201).json({ group: summary(populated, user) });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ msg: "A group with this name already exists" });
    }
    console.error("[groups] create failed:", error.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET api/groups/:id
// @desc    Group detail with members, membership state and owner controls
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ msg: "Group not found" });
    }

    const user = await currentUser(req);
    if (!user) return res.status(401).json({ msg: "User not found" });

    const group = await Group.findById(req.params.id)
      .populate("owner", "name avatar role designation organisation")
      .populate(
        "members.user",
        "name avatar role program passing_year designation organisation"
      )
      .populate("joinRequests.user", "name avatar role email")
      .populate("invites.user", "name avatar role email")
      .lean();

    if (!group) return res.status(404).json({ msg: "Group not found" });

    const manage = canManage(group, user);
    const visible = canViewDiscussions(group, user);
    const [discussionsCount] = await Promise.all([
      Post.countDocuments({ group: group._id }),
    ]);

    res.json({
      group: {
        ...summary(group, user),
        guidelines: group.guidelines || "",
        members: visible ? (group.members || []).map(memberView) : [],
        requests: manage
          ? (group.joinRequests || [])
              .filter((request) => request.status === "pending")
              .map((request) => ({
                _id: request._id,
                user: request.user
                  ? {
                      _id: request.user._id,
                      name: request.user.name,
                      avatar: request.user.avatar,
                      role: request.user.role,
                      email: request.user.email,
                    }
                  : null,
                message: request.message,
                createdAt: request.createdAt,
              }))
          : [],
        invites: manage
          ? (group.invites || []).map((invite) => ({
              user: invite.user
                ? {
                    _id: invite.user._id,
                    name: invite.user.name,
                    avatar: invite.user.avatar,
                    email: invite.user.email,
                  }
                : null,
              createdAt: invite.createdAt,
            }))
          : [],
        canManage: manage,
        canViewDiscussions: visible,
        discussionsCount,
      },
    });
  } catch (error) {
    console.error("[groups] detail failed:", error.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST api/groups/:id/join
// @desc    Join an open group, request access, or accept an invite
// @access  Private
router.post("/:id/join", auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ msg: "Group not found" });
    }

    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ msg: "Group not found" });

    const userId = String(req.user.id);
    if (memberOf(group, userId)) {
      return res.status(400).json({ msg: "You are already a member" });
    }

    const invited = invitedUser(group, userId);
    if (group.access === "INVITE" && !invited) {
      return res.status(403).json({ msg: "This group is invite only" });
    }

    if (group.access === "REQUEST" && !invited) {
      if (pendingRequestOf(group, userId)) {
        return res.status(400).json({ msg: "Your request is already pending" });
      }
      group.joinRequests.push({
        user: req.user.id,
        message: String(req.body.message || "").slice(0, 300),
      });
      await group.save();
      queueSearchRefresh("group", group._id);
      return res.json({ status: "pending" });
    }

    group.members.push({ user: req.user.id, role: "member" });
    if (invited) {
      group.invites = group.invites.filter(
        (invite) => idOf(invite.user) !== userId
      );
    }
    await group.save();
    queueSearchRefresh("group", group._id);
    res.json({ status: "joined" });
  } catch (error) {
    console.error("[groups] join failed:", error.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST api/groups/:id/leave
// @desc    Leave a group; the owner must delete or hand over the group
// @access  Private
router.post("/:id/leave", auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ msg: "Group not found" });

    const userId = String(req.user.id);
    if (isOwner(group, userId)) {
      return res
        .status(400)
        .json({ msg: "Owners cannot leave. Delete the group instead." });
    }
    if (!memberOf(group, userId)) {
      return res.status(400).json({ msg: "You are not a member" });
    }

    group.members = group.members.filter(
      (member) => idOf(member.user) !== userId
    );
    await group.save();
    queueSearchRefresh("group", group._id);
    res.json({ status: "left" });
  } catch (error) {
    console.error("[groups] leave failed:", error.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET api/groups/:id/requests
// @desc    Pending join requests (owner or admin)
// @access  Private
router.get("/:id/requests", auth, async (req, res) => {
  try {
    const user = await currentUser(req);
    const group = await Group.findById(req.params.id)
      .populate("joinRequests.user", "name avatar role email")
      .lean();
    if (!group) return res.status(404).json({ msg: "Group not found" });
    if (!canManage(group, user)) {
      return res.status(403).json({ msg: "Only the owner can review requests" });
    }

    res.json({
      requests: (group.joinRequests || [])
        .filter((request) => request.status === "pending")
        .map((request) => ({
          _id: request._id,
          user: request.user
            ? {
                _id: request.user._id,
                name: request.user.name,
                avatar: request.user.avatar,
                role: request.user.role,
                email: request.user.email,
              }
            : null,
          message: request.message,
          createdAt: request.createdAt,
        })),
    });
  } catch (error) {
    console.error("[groups] requests failed:", error.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST api/groups/:id/requests/:requestId
// @desc    Approve or reject a pending join request (owner or admin)
// @access  Private
router.post("/:id/requests/:requestId", auth, async (req, res) => {
  try {
    const user = await currentUser(req);
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ msg: "Group not found" });
    if (!canManage(group, user)) {
      return res.status(403).json({ msg: "Only the owner can review requests" });
    }

    const action = String(req.body.action || "").toLowerCase();
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ msg: "Action must be approve or reject" });
    }

    const request = group.joinRequests.id(req.params.requestId);
    if (!request) return res.status(404).json({ msg: "Request not found" });
    if (request.status !== "pending") {
      return res.status(400).json({ msg: "This request was already decided" });
    }

    request.status = action === "approve" ? "approved" : "rejected";
    request.decidedAt = new Date();
    request.decidedBy = req.user.id;

    if (action === "approve" && !memberOf(group, idOf(request.user))) {
      group.members.push({ user: request.user, role: "member" });
    }

    await group.save();
    queueSearchRefresh("group", group._id);
    res.json({ status: request.status });
  } catch (error) {
    console.error("[groups] request decision failed:", error.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST api/groups/:id/invite
// @desc    Invite a member by email (owner or admin)
// @access  Private
router.post("/:id/invite", auth, async (req, res) => {
  try {
    const user = await currentUser(req);
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ msg: "Group not found" });
    if (!canManage(group, user)) {
      return res.status(403).json({ msg: "Only the owner can invite members" });
    }

    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ msg: "Email is required" });

    const invitee = await User.findOne({ email })
      .select("name email avatar role")
      .lean();
    if (!invitee) return res.status(404).json({ msg: "No member with that email" });
    if (memberOf(group, invitee._id)) {
      return res.status(400).json({ msg: "That member is already in the group" });
    }
    if (invitedUser(group, invitee._id)) {
      return res.status(400).json({ msg: "That member is already invited" });
    }

    group.invites.push({ user: invitee._id, invitedBy: req.user.id });
    await group.save();
    queueSearchRefresh("group", group._id);

    res.json({
      invited: {
        _id: invitee._id,
        name: invitee.name,
        email: invitee.email,
        avatar: invitee.avatar,
      },
    });
  } catch (error) {
    console.error("[groups] invite failed:", error.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET api/groups/:id/discussions
// @desc    Group-scoped posts, oldest API contract but newest first
// @access  Private
router.get("/:id/discussions", auth, async (req, res) => {
  try {
    const user = await currentUser(req);
    const group = await Group.findById(req.params.id)
      .select("owner members access")
      .lean();
    if (!group) return res.status(404).json({ msg: "Group not found" });

    const visible = canViewDiscussions(group, user);
    if (!visible) {
      return res.json({ discussions: [], locked: true });
    }

    const discussions = await Post.find({ group: group._id })
      .sort({ date: -1 })
      .limit(60)
      .lean();

    res.json({
      discussions: discussions.filter((post) => canViewPost(user, post)),
      locked: false,
    });
  } catch (error) {
    console.error("[groups] discussions failed:", error.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST api/groups/:id/discussions
// @desc    Start a group discussion (members only)
// @access  Private
router.post("/:id/discussions", auth, async (req, res) => {
  try {
    const user = await currentUser(req);
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ msg: "Group not found" });

    const allowed =
      user?.isAdmin || isOwner(group, user?._id) || memberOf(group, user?._id);
    if (!allowed) {
      return res.status(403).json({ msg: "Join this group to start a discussion" });
    }

    const heading = String(req.body.heading || "").trim();
    const text = String(req.body.text || "").trim();
    if (heading.length < 3 || heading.length > 160) {
      return res.status(400).json({ msg: "Title must be 3–160 characters" });
    }
    if (text.length < 2) {
      return res.status(400).json({ msg: "Write something before posting" });
    }
    if (profanity.isProfane(`${heading} ${text}`)) {
      return res.status(400).json({ msg: "Please remove profanity" });
    }

    const post = await Post.create({
      user: req.user.id,
      heading,
      text,
      name: user.name,
      avatar: user.avatar,
      visibility: ["student", "faculty", "alumni"],
      channel: group.name,
      group: group._id,
      images: [],
    });

    res.status(201).json({ discussion: post });
  } catch (error) {
    console.error("[groups] discussion create failed:", error.message);
    res.status(500).send("Server Error");
  }
});

// @route   DELETE api/groups/:id
// @desc    Delete a group and its discussions (owner or admin)
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const user = await currentUser(req);
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ msg: "Group not found" });
    if (!canManage(group, user)) {
      return res.status(403).json({ msg: "Only the owner can delete this group" });
    }

    await Post.deleteMany({ group: group._id });
    await group.deleteOne();
    await removeSearchDocument("group", req.params.id);
    res.json({ deleted: true });
  } catch (error) {
    console.error("[groups] delete failed:", error.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
