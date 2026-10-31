import DOMPurify from "dompurify";

// Posts are authored with a rich-text editor, but the API also accepts raw
// HTML. Sanitize every HTML string before handing it to html-react-parser so a
// crafted post cannot inject scripts, event handlers or javascript: links.
const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "blockquote",
  "ul", "ol", "li", "a", "h1", "h2", "h3", "h4", "h5", "h6",
  "img", "figure", "figcaption", "code", "pre", "span", "div", "hr",
];

const ALLOWED_ATTR = [
  "href", "src", "alt", "title", "target", "rel",
  "width", "height", "class",
];

export default function sanitizeHtml(html) {
  if (typeof html !== "string" || html.trim() === "") return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "button", "link", "meta"],
    FORBID_ATTR: ["style", "srcdoc"],
  });
}
