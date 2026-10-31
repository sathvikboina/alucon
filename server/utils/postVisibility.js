// Shared visibility rule for community posts.
//
// A post is visible when it is public (empty visibility), the viewer's role is
// listed, the viewer wrote it, or the viewer is an admin. Keeping this in one
// place means the feed, the post page and the AI layer cannot drift apart.

function canViewPost(user, post) {
  if (!user || !post) return false;
  if (user.isAdmin) return true;
  if (post.user && String(post.user) === String(user._id)) return true;

  const visibility = Array.isArray(post.visibility) ? post.visibility : [];
  if (visibility.length === 0) return true;

  const role = String(user.role || "").toLowerCase();
  return visibility.some((value) => String(value).toLowerCase() === role);
}

module.exports = { canViewPost };
