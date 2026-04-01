import type { ProjectFileEntry } from "../store/asset-store";
import type { CardAttachment } from "./types";

export interface ParsedCardReference {
  title: string;
  cardId?: string;
}

export interface ParsedFileReference {
  name: string;
  relativePath: string;
}

function dedupeByKey<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function extractCardReferencesFromHtml(html: string): ParsedCardReference[] {
  if (!html) {
    return [];
  }

  const references: ParsedCardReference[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  doc.querySelectorAll<HTMLElement>("[data-wikilink]").forEach((element) => {
    const title = element.dataset.wikilink?.trim();
    if (!title) {
      return;
    }

    const cardId = element.dataset.cardId?.trim();
    references.push({
      title,
      cardId: cardId || undefined,
    });
  });

  const rawPattern = /\[\[([^\]]+)\]\](?:<!--\s*flo-link:([A-Za-z0-9_-]+)\s*-->)?/g;
  for (const match of html.matchAll(rawPattern)) {
    const title = match[1]?.trim();
    if (!title) {
      continue;
    }

    references.push({
      title,
      cardId: match[2]?.trim() || undefined,
    });
  }

  return dedupeByKey(references, (reference) => `${reference.cardId ?? ""}:${reference.title}`);
}

export function extractFileReferencesFromHtml(html: string): ParsedFileReference[] {
  if (!html) {
    return [];
  }

  const references: ParsedFileReference[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  doc.querySelectorAll<HTMLElement>("[data-file-ref]").forEach((element) => {
    const relativePath = element.dataset.fileRef?.trim();
    if (!relativePath) {
      return;
    }

    references.push({
      relativePath,
      name: element.dataset.fileName?.trim() || relativePath.split("/").pop() || relativePath,
    });
  });

  const rawPattern = /\[([^\]]+)\]\(([^)]+)\)<!--\s*flo-file\s*-->/g;
  for (const match of html.matchAll(rawPattern)) {
    const name = match[1]?.trim();
    const relativePath = match[2]?.trim();
    if (!name || !relativePath) {
      continue;
    }
    references.push({ name, relativePath });
  }

  return dedupeByKey(references, (reference) => reference.relativePath);
}

export function resolveWorkspaceFilePath(dirPath: string | null, relativePath: string): string | null {
  if (!dirPath) {
    return null;
  }

  const normalizedBase = dirPath.replace(/[\\/]+$/, "");
  const normalizedRelative = relativePath.replace(/^[/\\]+/, "").replace(/\\/g, "/");
  return `${normalizedBase}/${normalizedRelative}`;
}

export function createAttachmentFromFile(entry: ProjectFileEntry): CardAttachment {
  return {
    id: entry.relative_path,
    relativePath: entry.relative_path,
    name: entry.name,
    extension: entry.extension ?? undefined,
    size: entry.size,
    addedAt: Date.now(),
  };
}
