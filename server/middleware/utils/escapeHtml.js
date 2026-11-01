const HTML_ENTITIES = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

/**
 * Escape a value before interpolating it into an HTML email or template.
 * Non-strings are stringified; null and undefined become an empty string.
 */
function escapeHtml(value) {
	return String(value ?? "").replace(/[&<>"']/g, (ch) => HTML_ENTITIES[ch]);
}

module.exports = escapeHtml;
