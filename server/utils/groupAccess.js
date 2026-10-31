const Group = require("../models/Group");

// Group discussions are stored as ordinary Post documents with a `group` ref,
// so the existing likes/comments/AI paths keep working. The cost is that every
// post read must re-check the group's membership rule; this helper is the one
// place that knows it.
//
// OPEN groups are readable by any signed-in member (the prototype lets anyone
// join immediately). REQUEST and INVITE groups are readable only by members,
// the owner and admins.
async function canViewGroupPost(user, post) {
  if (!post || !post.group) return true;
  if (!user) return false;
  if (user.isAdmin) return true;

  const userId = String(user._id || user.id || "");
  const group = await Group.findById(post.group)
    .select("owner members access")
    .lean();
  if (!group) return false;

  if (String(group.owner) === userId) return true;
  if ((group.members || []).some((member) => String(member.user) === userId)) {
    return true;
  }
  return group.access === "OPEN";
}

module.exports = { canViewGroupPost };
