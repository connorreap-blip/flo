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
 * Convert TipTap HTML content to clean markdown.
 * Handles headings, bold, italic, underline, lists, code blocks,
 * blockquotes, wikilinks, and paragraphs.
 */
function extractDataAttribute(tag: string, attribute: string): string | null {
  const match = new RegExp(`${attribute}="([^"]*)"`).exec(tag);
  return match?.[1] ?? null;
}

function renderWikilinkSpan(title: string, cardId?: string | null): string {
  const attrs = [`data-wikilink="${title}"`];
  if (cardId) {
    attrs.push(`data-card-id="${cardId}"`);
  }
  return `<span ${attrs.join(" ")} class="wikilink">[[${title}]]</span>`;
}

function renderFileRefSpan(name: string, relativePath: string): string {
  return `<span data-file-ref="${relativePath}" data-file-name="${name}" class="file-ref">${name}</span>`;
}

function htmlToMarkdown(html: string): string {
  if (!html) return "";
  return html
    .replace(/<span([^>]*)>.*?<\/span>/g, (fullMatch, attrs) => {
      const title = extractDataAttribute(attrs, "data-wikilink");
      if (title) {
        const cardId = extractDataAttribute(attrs, "data-card-id");
        return `[[${title}]]${cardId ? `<!-- flo-link:${cardId} -->` : ""}`;
      }

      const relativePath = extractDataAttribute(attrs, "data-file-ref");
      if (relativePath) {
        const name = extractDataAttribute(attrs, "data-file-name") ?? relativePath.split("/").pop() ?? relativePath;
        return `[${name}](${relativePath})<!-- flo-file -->`;
      }

      return fullMatch;
    })
    .replace(/<h1>(.*?)<\/h1>/g, "# $1\n")
    .replace(/<h2>(.*?)<\/h2>/g, "## $1\n")
    .replace(/<h3>(.*?)<\/h3>/g, "### $1\n")
    .replace(/<blockquote><p>(.*?)<\/p><\/blockquote>/g, "> $1\n")
    .replace(/<pre><code>(.*?)<\/code><\/pre>/gs, "```\n$1\n```\n")
    .replace(/<strong>(.*?)<\/strong>/g, "**$1**")
    .replace(/<em>(.*?)<\/em>/g, "*$1*")
    .replace(/<u>(.*?)<\/u>/g, "<u>$1</u>")
    // Lists: strip wrapper, convert items
    .replace(/<ul>(.*?)<\/ul>/gs, "$1")
    .replace(/<ol>(.*?)<\/ol>/gs, "$1")
    .replace(/<li>(.*?)<\/li>/g, "- $1\n")
    .replace(/<p><\/p>/g, "\n")
    .replace(/<p>(.*?)<\/p>/g, "$1\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, "")
    // Clean up excessive blank lines
    .replace(/\n{3,}/g, "\n\n")
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
      // Handle headings
      if (/^### /.test(para)) return para.replace(/^### (.*)$/m, "<h3>$1</h3>");
      if (/^## /.test(para)) return para.replace(/^## (.*)$/m, "<h2>$1</h2>");
      if (/^# /.test(para)) return para.replace(/^# (.*)$/m, "<h1>$1</h1>");
      // Handle blockquotes
      if (/^> /.test(para)) return `<blockquote><p>${para.replace(/^> /, "")}</p></blockquote>`;
      // Handle code blocks
      if (/^```/.test(para)) {
        const code = para.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
        return `<pre><code>${code}</code></pre>`;
      }
      // Handle list blocks (lines starting with - )
      const listLines = para.split("\n").filter((l) => /^- /.test(l));
      if (listLines.length > 0 && listLines.length === para.split("\n").filter((l) => l.trim()).length) {
        const items = listLines.map((l) => `<li>${inlineMarkdown(l.replace(/^- /, ""))}</li>`).join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${inlineMarkdown(para)}</p>`;
    })
    .join("");
}

function inlineMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)<!--\s*flo-file\s*-->/g, (_, name, relativePath) =>
      renderFileRefSpan(name, relativePath)
    )
    .replace(/\[\[([^\]]+)\]\](?:<!--\s*flo-link:([A-Za-z0-9_-]+)\s*-->)?/g, (_, title, cardId) =>
      renderWikilinkSpan(title, cardId)
    )
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>");
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
