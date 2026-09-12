import sanitizeHtml from "sanitize-html";

/**
 * Sanitizes lesson `body_html` right before it reaches a client component —
 * the single enforcement point regardless of how body_html got into the DB
 * (today: scripts/set-text-asset.ts; later: whatever admin UI writes it).
 * Prose-focused allowlist: no <script>, <style>, <iframe>, or event handlers.
 */
export function sanitizeLessonHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "h1", "h2", "h3", "h4",
      "p", "br", "hr",
      "strong", "b", "em", "i", "u",
      "ul", "ol", "li",
      "blockquote", "code", "pre",
      "a",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
}
