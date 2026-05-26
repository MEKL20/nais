/**
 * Minimal inline markdown renderer for chat bubbles.
 * Handles: bold, italic, inline code, links (open in new tab), line breaks.
 * Does NOT require any external dependencies.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Render a markdown string as a React-compatible HTML string.
 * Return value should be used with `dangerouslySetInnerHTML`.
 */
export function renderMarkdown(text: string): string {
  // 1. Escape HTML first (before processing markdown syntax)
  let html = escapeHtml(text);

  // 2. Inline code: `code`
  html = html.replace(
    /`([^`]+)`/g,
    "<code style=\"background:#2a2a2a;padding:0.1em 0.35em;border-radius:0.25rem;font-size:0.85em;font-family:monospace\">$1</code>",
  );

  // 3. Bold: **text** or __text__
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");

  // 4. Italic: *text* or _text_ (but not inside words, simplistic)
  html = html.replace(/(?<![a-zA-Z])\*([^*]+)\*(?![a-zA-Z*])/g, "<em>$1</em>");
  html = html.replace(/(?<=^|[^a-zA-Z])_([^_]+)_(?=[^a-zA-Z_]|$)/g, "<em>$1</em>");

  // 5. Links: [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--primary)">$1</a>',
  );

  // 6. Line breaks: double newline = paragraph, single newline = <br>
  html = html.replace(/\n\n/g, "</p><p>");
  html = html.replace(/\n/g, "<br>");

  return `<p>${html}</p>`;
}
