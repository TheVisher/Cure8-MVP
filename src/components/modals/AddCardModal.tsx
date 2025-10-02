"use client";

import React from "react";

import MultiTagInput from "@/src/components/inputs/MultiTagInput";
import { useCardsStore } from "@/src/state/cardsStore";

type AddCardModalProps = {
  open: boolean;
  onClose: () => void;
  initialUrl?: string;
  onSave?: (data: { url?: string; title: string; notes?: string; tags: string[] }) => void;
};

const focusableSelectors = [
  "a[href]",
  "button:not([disabled])",
  "textarea",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export default function AddCardModal({ open, onClose, initialUrl, onSave }: AddCardModalProps) {
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const [url, setUrl] = React.useState(initialUrl ?? "");
  const [title, setTitle] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);
  const upsertCard = useCardsStore((state) => state.upsertCard);

  React.useEffect(() => {
    if (!open) {
      setUrl(initialUrl ?? "");
      setTitle("");
      setNotes("");
      setTags([]);
      return;
    }

    if (initialUrl) {
      setUrl(initialUrl);
    }

    const node = dialogRef.current;
    if (!node) return;

    const focusables = Array.from(node.querySelectorAll<HTMLElement>(focusableSelectors));
    focusables[0]?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "Tab" && focusables.length > 0) {
        const { activeElement } = document;
        const currentIndex = focusables.indexOf(activeElement as HTMLElement);
        let nextIndex = currentIndex;
        if (event.shiftKey) {
          nextIndex = currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1;
        } else {
          nextIndex = currentIndex === focusables.length - 1 ? 0 : currentIndex + 1;
        }
        event.preventDefault();
        focusables[nextIndex]?.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, initialUrl, onClose]);

  React.useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dialogRef.current && !dialogRef.current.contains(target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const trimmedUrl = url.trim();
    const trimmedNotes = notes.trim();

    if (!trimmedUrl) {
      alert("URL is required");
      return;
    }

    if (isSaving) return;

    setIsSaving(true);

    try {
      const tagSlugs = Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));

      const response = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: trimmedUrl,
          title: trimmedTitle,
          notes: trimmedNotes || null,
          tags: tagSlugs,
          status: "READY",
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = typeof errorBody?.error === "string" ? errorBody.error : "Unable to save card";
        throw new Error(message);
      }

      const serverCard = await response.json();
      upsertCard(serverCard);

      if (onSave) {
        onSave({
          url: trimmedUrl,
          title: trimmedTitle,
          notes: trimmedNotes || undefined,
          tags: tagSlugs,
        });
      }

      onClose();
    } catch (error) {
      console.error("Failed to create card", error);
      const message = error instanceof Error ? error.message : "Unable to save card";
      alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  const saveDisabled = !title.trim() || isSaving;

  return (
    <div className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm">
      <div className="fixed inset-0 grid place-items-center">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-card-modal-title"
          className="w-full max-w-2xl rounded-2xl border border-violet-500/30 bg-[rgba(10,10,18,0.86)] p-6 shadow-[0_0_0_1px_rgba(168,85,247,0.18),0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl"
        >
          <header className="space-y-1">
            <h2 id="add-card-modal-title" className="text-lg font-semibold text-violet-100">
              Add Card
            </h2>
          </header>

          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleSave();
            }}
          >
            <div className="space-y-2">
              <label htmlFor="add-card-url" className="text-sm font-medium text-violet-200/80">
                URL
              </label>
              <input
                id="add-card-url"
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com"
                className="rounded-xl border border-violet-500/30 bg-black/30 px-3 py-2 text-sm text-violet-100 placeholder:text-violet-200/40 focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="add-card-title" className="text-sm font-medium text-violet-200/80">
                Title <span className="text-violet-300">*</span>
              </label>
              <input
                id="add-card-title"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Amazing article"
                className="rounded-xl border border-violet-500/30 bg-black/30 px-3 py-2 text-sm text-violet-100 placeholder:text-violet-200/40 focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-medium text-violet-200/80">Tags</label>
              <MultiTagInput value={tags} onChange={setTags} placeholder="Add tags…" />
            </div>

            <div className="space-y-2">
              <label htmlFor="add-card-notes" className="text-sm font-medium text-violet-200/80">
                Notes
              </label>
              <textarea
                id="add-card-notes"
                rows={5}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add quick context, highlights, or why it matters..."
                className="rounded-xl border border-violet-500/30 bg-black/30 px-3 py-2 text-sm text-violet-100 placeholder:text-violet-200/40 focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-3 py-2 text-sm font-medium text-violet-200/80 transition hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveDisabled}
                className="rounded-xl bg-violet-600/80 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_12px_rgba(139,92,246,0.45)] transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-violet-600/40 disabled:text-violet-200/60 disabled:shadow-none"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
