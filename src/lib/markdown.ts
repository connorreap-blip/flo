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
function htmlToMarkdown(html: string): string {
  if (!html) return "";
  return html
    // Resolve wikilinks: <span data-wikilink="Title" ...>[[Title]]</span>
    .replace(/<span[^>]*data-wikilink="([^"]*)"[^>]*>.*?<\/span>/g, (_, title) => `[[${title}]]`)
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
    .replace(/\[\[([^\]]+)\]\]/g, '<span data-wikilink="$1" class="wikilink">[[$1]]</span>')
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
