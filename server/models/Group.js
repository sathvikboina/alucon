const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Community hubs modelled on the prototype's Groups & Cohorts page.
//
// Membership is embedded because a demo group is small (tens of members) and
// every group read needs the member list anyway. Join requests and invites are
// also embedded so one document describes the whole membership state.
const GROUP_CATEGORIES = ["BATCH", "PROGRAMME", "CLUB", "CHAPTER", "COHORT", "INVITE"];
const GROUP_ACCESS = ["OPEN", "REQUEST", "INVITE"];
const MEMBER_ROLES = ["owner", "moderator", "member"];

const GroupMemberSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "user", required: true },
    role: { type: String, enum: MEMBER_ROLES, default: "member" },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const GroupJoinRequestSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "user", required: true },
  message: { type: String, default: "", maxlength: 300 },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
  decidedAt: { type: Date },
  decidedBy: { type: Schema.Types.ObjectId, ref: "user" },
});

const GroupInviteSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "user", required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: "user" },
    createdAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date },
  },
  { _id: false }
);

const GroupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    initials: { type: String, default: "" },
    description: { type: String, required: true, trim: true, maxlength: 600 },
    guidelines: { type: String, default: "", maxlength: 1200 },
    category: { type: String, enum: GROUP_CATEGORIES, default: "CLUB" },
    access: { type: String, enum: GROUP_ACCESS, default: "OPEN" },
    owner: { type: Schema.Types.ObjectId, ref: "user", required: true },
    members: { type: [GroupMemberSchema], default: [] },
    joinRequests: { type: [GroupJoinRequestSchema], default: [] },
    invites: { type: [GroupInviteSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

GroupSchema.index({ name: 1 }, { unique: true });
GroupSchema.index({ category: 1, createdAt: -1 });
GroupSchema.index({ "members.user": 1 });
GroupSchema.index({ name: "text", description: "text" });

GroupSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const Group = mongoose.model("group", GroupSchema);
Group.CATEGORIES = GROUP_CATEGORIES;
Group.ACCESS = GROUP_ACCESS;
Group.MEMBER_ROLES = MEMBER_ROLES;

module.exports = Group;
