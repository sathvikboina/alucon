// Shared time helpers for the messenger UI.

export function timeAgo(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60)    return "now";
  if (diff < 3600)  return Math.floor(diff / 60) + "m";
  if (diff < 86400) return Math.floor(diff / 3600) + "h";
  return Math.floor(diff / 86400) + "d";
}

export function formatDateLabel(iso) {
  if (!iso) return "";
  const d   = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}
