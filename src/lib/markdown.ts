import matter from "gray-matter";
import type { Card } from "./types";

interface CardFrontmatter {
  id: string;
  title: string;
  type: string;
  created: string;
  modified: string;
  status: string;
}

/**
 * Convert TipTap HTML content to simple markdown.
 * Handles bold, italic, underline, paragraphs.
 */
function htmlToMarkdown(html: string): string {
  if (!html) return "";
  return html
    .replace(/<strong>(.*?)<\/strong>/g, "**$1**")
    .replace(/<em>(.*?)<\/em>/g, "*$1*")
    .replace(/<u>(.*?)<\/u>/g, "<u>$1</u>")
    .replace(/<p><\/p>/g, "\n")
    .replace(/<p>(.*?)<\/p>/g, "$1\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .trim();
}

/**
 * Convert simple markdown back to TipTap-compatible HTML.
 */
function markdownToHtml(md: string): string {
  if (!md) return "";
  return md
    .split("\n\n")
    .map((para) => {
      const html = para
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>");
      return `<p>${html}</p>`;
    })
    .join("");
}

/**
 * Serialize a card's document to markdown with YAML frontmatter.
 */
export function serializeCardToMarkdown(card: Card): string {
  const frontmatter: CardFrontmatter = {
    id: card.id,
    title: card.title,
    type: card.type,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    status: "active",
  };

  const content = htmlToMarkdown(card.docContent);
  const body = `# ${card.title}\n\n${content}`;

  return matter.stringify(body, frontmatter);
}

/**
 * Deserialize a markdown file with YAML frontmatter back into card doc content.
 * Returns the frontmatter data and HTML content for TipTap.
 */
export function deserializeMarkdown(raw: string): {
  frontmatter: CardFrontmatter;
  htmlContent: string;
  rawContent: string;
} {
  const { data, content } = matter(raw);
  // Strip the leading # Title line if present
  const bodyContent = content.replace(/^#\s+.*\n\n/, "").trim();
  return {
    frontmatter: data as CardFrontmatter,
    htmlContent: markdownToHtml(bodyContent),
    rawContent: bodyContent,
  };
}
