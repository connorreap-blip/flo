import { useEffect, useMemo, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";
import { FileImage, FileText, FolderOpen, RefreshCw, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useProjectStore } from "../store/project-store";
import { useAssetStore, type ProjectFileEntry } from "../store/asset-store";
import { useCanvasStore } from "../store/canvas-store";
import { createAttachmentFromFile } from "../lib/doc-links";

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatTimestamp(value?: number | null): string {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function categoryLabel(category: string): string {
  if (category === "workspace") return "Workspace";
  if (category === "asset") return "Imported";
  if (category === "internal") return "App";
  return "File";
}

function fileIcon(entry: ProjectFileEntry) {
  const extension = entry.extension?.toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(extension ?? "")) {
    return <FileImage size={14} />;
  }
  return <FileText size={14} />;
}

export function FilesTab() {
  const dirPath = useProjectStore((state) => state.project.dirPath);
  const files = useAssetStore((state) => state.files);
  const selectedRelativePath = useAssetStore((state) => state.selectedRelativePath);
  const preview = useAssetStore((state) => state.preview);
  const loading = useAssetStore((state) => state.loading);
  const previewLoading = useAssetStore((state) => state.previewLoading);
  const error = useAssetStore((state) => state.error);
  const loadFiles = useAssetStore((state) => state.loadFiles);
  const selectFile = useAssetStore((state) => state.selectFile);
  const importFiles = useAssetStore((state) => state.importFiles);
  const clear = useAssetStore((state) => state.clear);
  const cards = useCanvasStore((state) => state.cards);
  const updateCard = useCanvasStore((state) => state.updateCard);

  const [query, setQuery] = useState("");
  const [showInternal, setShowInternal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  const [attachQuery, setAttachQuery] = useState("");
  const [attachMessage, setAttachMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!dirPath) {
      clear();
      return;
    }

    void loadFiles(dirPath);
  }, [clear, dirPath, loadFiles]);

  const visibleFiles = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return files.filter((entry) => {
      if (!showInternal && entry.category === "internal") {
        return false;
      }

      if (!needle) {
        return true;
      }

      return (
        entry.name.toLowerCase().includes(needle) ||
        entry.relative_path.toLowerCase().includes(needle)
      );
    });
  }, [files, query, showInternal]);

  useEffect(() => {
    if (!dirPath || selectedRelativePath || visibleFiles.length === 0) {
      return;
    }

    void selectFile(dirPath, visibleFiles[0].relative_path);
  }, [dirPath, selectFile, selectedRelativePath, visibleFiles]);

  const selectedFile = useMemo(
    () => files.find((entry) => entry.relative_path === selectedRelativePath) ?? null,
    [files, selectedRelativePath]
  );

  const counts = useMemo(
    () => ({
      workspace: files.filter((entry) => entry.category === "workspace").length,
      asset: files.filter((entry) => entry.category === "asset").length,
      internal: files.filter((entry) => entry.category === "internal").length,
    }),
    [files]
  );

  const attachableCards = useMemo(() => {
    const needle = attachQuery.trim().toLowerCase();

    return cards.filter((entry) => {
      if (!needle) {
        return true;
      }

      return (
        entry.title.toLowerCase().includes(needle) ||
        entry.type.toLowerCase().includes(needle) ||
        entry.body.toLowerCase().includes(needle)
      );
    });
  }, [attachQuery, cards]);

  const handleImport = async () => {
    if (!dirPath) return;

    const picked = await open({
      title: "Import files into this workspace",
      multiple: true,
      directory: false,
    });

    const filePaths = Array.isArray(picked) ? picked : picked ? [picked] : [];
    if (filePaths.length === 0) {
      return;
    }

    setImporting(true);
    const imported = await importFiles(dirPath, filePaths);
    if (imported[0]) {
      void selectFile(dirPath, imported[0].relative_path);
    }
    setImporting(false);
  };

  const attachSelectedFileToCard = (targetCardId: string) => {
    if (!selectedFile) {
      return;
    }

    const targetCard = cards.find((entry) => entry.id === targetCardId);
    if (!targetCard) {
      return;
    }

    const nextAttachment = createAttachmentFromFile(selectedFile);
    const existingAttachments = targetCard.attachments ?? [];
    const alreadyAttached = existingAttachments.some(
      (attachment) => attachment.relativePath === selectedFile.relative_path
    );

    if (!alreadyAttached) {
      updateCard(targetCardId, {
        attachments: [...existingAttachments, nextAttachment],
      });
    }

    setAttachDialogOpen(false);
    setAttachQuery("");
    setAttachMessage(`${alreadyAttached ? "Already attached to" : "Attached to"} ${targetCard.title || "Untitled"}.`);
  };

  if (!dirPath) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div
          className="pixel-border max-w-lg px-6 py-6 text-center"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-card-border)" }}
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center border" style={{
            borderColor: "var(--color-card-border)",
            background: "var(--color-surface-high)",
          }}>
            <FolderOpen size={20} />
          </div>
          <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-headline)" }}>
            Open or save a workspace first
          </h2>
          <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Files live inside the workspace folder. Once a folder is connected, you can browse what is already there
            and import more files into it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ color: "var(--color-text-primary)" }}>
      <div
        className="border-b px-4 py-3"
        style={{ borderColor: "var(--color-card-border)", background: "var(--color-surface)" }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.3em]"
              style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
            >
              Workspace Folder
            </div>
            <div className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {dirPath}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="border text-xs"
              style={{
                borderColor: "var(--color-card-border)",
                background: "var(--color-surface-high)",
                color: "var(--color-text-primary)",
              }}
              onClick={() => void loadFiles(dirPath)}
            >
              <RefreshCw size={14} />
              Refresh
            </Button>
            <Button
              type="button"
              className="text-xs"
              style={{ background: "#F4F1E8", color: "#111111" }}
              onClick={() => void handleImport()}
              disabled={importing}
            >
              <Upload size={14} />
              {importing ? "Importing..." : "Import Files"}
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <SummaryCard label="Workspace files" value={counts.workspace} />
          <SummaryCard label="Imported files" value={counts.asset} />
          <SummaryCard label="App files" value={counts.internal} />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside
          className="flex min-h-0 flex-col border-r"
          style={{ borderColor: "var(--color-card-border)", background: "var(--color-surface-lowest)" }}
        >
          <div className="border-b px-4 py-3" style={{ borderColor: "var(--color-card-border)" }}>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search files..."
              className="border"
              style={{
                borderColor: "var(--color-card-border)",
                background: "var(--color-surface)",
                color: "var(--color-text-primary)",
              }}
            />
            <div className="mt-2 flex items-center justify-between">
              <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                {visibleFiles.length} file{visibleFiles.length === 1 ? "" : "s"}
              </div>
              <button
                type="button"
                className="text-[10px] uppercase tracking-[0.24em]"
                style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}
                onClick={() => setShowInternal((current) => !current)}
              >
                {showInternal ? "Hide App Files" : "Show App Files"}
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <EmptyState
                title="Loading files..."
                detail="Reading the workspace folder."
              />
            ) : visibleFiles.length === 0 ? (
              <EmptyState
                title="No files yet"
                detail="Import files, or create work inside this folder and it will appear here."
              />
            ) : (
              visibleFiles.map((entry) => {
                const selected = entry.relative_path === selectedRelativePath;
                return (
                  <button
                    key={entry.relative_path}
                    type="button"
                    className="flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors"
                    style={{
                      borderColor: "var(--color-card-border)",
                      background: selected ? "var(--color-surface-high)" : "transparent",
                    }}
                    onClick={() => void selectFile(dirPath, entry.relative_path)}
                  >
                    <div
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border"
                      style={{
                        borderColor: "var(--color-card-border)",
                        background: "var(--color-surface)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {fileIcon(entry)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{entry.name}</span>
                        <span
                          className="shrink-0 border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.22em]"
                          style={{
                            borderColor: "var(--color-card-border)",
                            color: "var(--color-text-muted)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {categoryLabel(entry.category)}
                        </span>
                      </div>
                      <div className="mt-1 truncate text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                        {entry.parent || "Workspace root"}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
                        <span>{formatBytes(entry.size)}</span>
                        <span>{formatTimestamp(entry.modified_ms)}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="min-h-0 overflow-hidden" style={{ background: "var(--color-canvas-bg)" }}>
          {!selectedFile ? (
            <EmptyState
              title="Pick a file"
              detail="Select a file on the left to read it here."
            />
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              <div
                className="border-b px-4 py-3"
                style={{ borderColor: "var(--color-card-border)", background: "var(--color-surface)" }}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-lg font-semibold" style={{ fontFamily: "var(--font-headline)" }}>
                      {selectedFile.name}
                    </div>
                    <div className="mt-1 truncate text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      {selectedFile.relative_path}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedFile.category === "asset" ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="border text-xs"
                        style={{
                          borderColor: "var(--color-card-border)",
                          background: "var(--color-surface-high)",
                          color: "var(--color-text-primary)",
                        }}
                        onClick={() => {
                          setAttachDialogOpen(true);
                          setAttachQuery("");
                        }}
                      >
                        Add to Card
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      className="border text-xs"
                      style={{
                        borderColor: "var(--color-card-border)",
                        background: "var(--color-surface-high)",
                        color: "var(--color-text-primary)",
                      }}
                      onClick={() => void revealItemInDir(selectedFile.path)}
                    >
                      Show in Folder
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border text-xs"
                      style={{
                        borderColor: "var(--color-card-border)",
                        background: "var(--color-surface-high)",
                        color: "var(--color-text-primary)",
                      }}
                      onClick={() => void openPath(selectedFile.path)}
                    >
                      Open in Default App
                    </Button>
                  </div>
                </div>
                {attachMessage ? (
                  <div className="mt-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                    {attachMessage}
                  </div>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
                {previewLoading ? (
                  <EmptyState title="Loading preview..." detail="Preparing the file viewer." />
                ) : preview?.kind === "image" && preview.data_url ? (
                  <div className="flex h-full items-start justify-center">
                    <img
                      src={preview.data_url}
                      alt={selectedFile.name}
                      className="max-h-full max-w-full border object-contain"
                      style={{ borderColor: "var(--color-card-border)", background: "var(--color-surface)" }}
                    />
                  </div>
                ) : preview?.kind === "text" ? (
                  <div
                    className="pixel-border h-full overflow-auto"
                    style={{ background: "var(--color-surface)", borderColor: "var(--color-card-border)" }}
                  >
                    <div
                      className="border-b px-4 py-2 text-[10px] uppercase tracking-[0.28em]"
                      style={{
                        borderColor: "var(--color-card-border)",
                        color: "var(--color-text-muted)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {preview.truncated ? "Preview (trimmed)" : "Preview"}
                    </div>
                    <pre
                      className="overflow-auto px-4 py-4 text-sm whitespace-pre-wrap"
                      style={{
                        color: "var(--color-text-primary)",
                        fontFamily: "var(--font-mono)",
                        lineHeight: 1.6,
                      }}
                    >
                      {preview.content}
                    </pre>
                  </div>
                ) : (
                  <EmptyState
                    title="Preview not available"
                    detail={preview?.content ?? "Open this file in its default app to view it."}
                  />
                )}
              </div>
            </div>
          )}
          {error ? (
            <div
              className="border-t px-4 py-2 text-sm"
              style={{
                borderColor: "var(--color-card-border)",
                background: "rgba(160, 40, 40, 0.08)",
                color: "#F5C2C2",
              }}
            >
              {error}
            </div>
          ) : null}
        </section>
      </div>
      <Dialog open={attachDialogOpen} onOpenChange={setAttachDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add File to Card</DialogTitle>
            <DialogDescription>
              Attach {selectedFile?.name ?? "this file"} to a card. The file stays in `assets/`; this only creates a card association.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={attachQuery}
              onChange={(event) => setAttachQuery(event.target.value)}
              placeholder="Search cards..."
            />
            <div
              className="max-h-[340px] overflow-y-auto border"
              style={{ borderColor: "var(--color-card-border)", background: "var(--color-surface-lowest)" }}
            >
              {attachableCards.length > 0 ? (
                attachableCards.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="flex w-full items-center justify-between border-b px-3 py-3 text-left last:border-b-0"
                    style={{ borderColor: "var(--color-card-border)" }}
                    onClick={() => attachSelectedFileToCard(entry.id)}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{entry.title || "Untitled"}</div>
                      <div
                        className="mt-1 text-[10px] uppercase tracking-[0.2em]"
                        style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
                      >
                        {entry.type}
                      </div>
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>
                      {(entry.attachments?.length ?? 0) > 0 ? `${entry.attachments?.length} ATTACHMENTS` : "ADD"}
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-3 py-6 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                  No cards match that search.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="pixel-border px-3 py-3"
      style={{ background: "var(--color-surface-lowest)", borderColor: "var(--color-card-border)" }}
    >
      <div
        className="text-[10px] uppercase tracking-[0.3em]"
        style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
      >
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold" style={{ fontFamily: "var(--font-headline)" }}>
        {value}
      </div>
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex h-full items-center justify-center px-6 py-8">
      <div
        className="pixel-border max-w-lg px-5 py-5 text-center"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-card-border)" }}
      >
        <div className="text-base font-semibold" style={{ fontFamily: "var(--font-headline)" }}>
          {title}
        </div>
        <div className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {detail}
        </div>
      </div>
    </div>
  );
}
