'use client';

import React from "react";

function safeHost(url: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

type BookmarkItem = {
  id: string;
  title: string;
  url: string;
  domain: string;
  image?: string | null;
  description: string;
  notes: string;
  createdAt: number;
};

type BookmarkModalProps = {
  item: BookmarkItem;
  onClose: () => void;
  onDelete: () => void;
  onUpdateNotes: (id: string, notes: string) => void;
};

export function BookmarkModal({ item, onClose, onDelete, onUpdateNotes }: BookmarkModalProps) {
  const displayTitle = item.title?.trim() || item.url || item.domain || "Untitled";
  const displayDomain = item.domain || safeHost(item.url);
  const savedAt = item.createdAt ? new Date(item.createdAt) : null;
  const [draftNotes, setDraftNotes] = React.useState(item.notes || "");
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    setDraftNotes(item.notes || "");
  }, [item.id, item.notes]);

  const handleSave = () => {
    const trimmed = draftNotes.trim();
    if ((item.notes || "") === trimmed) return;
    setIsSaving(true);
    setDraftNotes(trimmed);
    onUpdateNotes(item.id, trimmed);
    setTimeout(() => setIsSaving(false), 200);
  };

  const dirty = (item.notes || "") !== draftNotes.trim();

  return (
    <div className="bookmark-modal-backdrop" onClick={onClose}>
      <div className="bookmark-modal" onClick={(e) => e.stopPropagation()}>
        <button className="bookmark-modal-close" onClick={onClose} aria-label="Close details">
          ×
        </button>

        <div className="bookmark-modal-media">
          {item.image ? (
            <img src={item.image} alt="Preview" />
          ) : (
            <div className="bookmark-modal-media-placeholder">{displayDomain || 'link'}</div>
          )}
        </div>

        <aside className="bookmark-modal-meta">
          <header className="bookmark-modal-header">
            <h2>{displayTitle}</h2>
            {displayDomain && <span className="bookmark-modal-domain">{displayDomain}</span>}
          </header>

          {item.url && (
            <div className="bookmark-modal-row">
              <span className="bookmark-modal-label">URL</span>
              <a className="bookmark-modal-url" href={item.url} target="_blank" rel="noreferrer">
                {item.url}
              </a>
            </div>
          )}

          {savedAt && (
            <div className="bookmark-modal-row">
              <span className="bookmark-modal-label">Saved</span>
              <span className="bookmark-modal-value">{savedAt.toLocaleString()}</span>
            </div>
          )}

          <div className="bookmark-modal-summary">
            <span className="bookmark-modal-label">Summary</span>
            <p>
              {item.description?.trim() ||
                "We're working on AI-powered annotations. For now, use notes below to capture a TL;DR."}
            </p>
          </div>

          <div className="bookmark-modal-notes">
            <span className="bookmark-modal-label">Notes</span>
            <textarea
              placeholder="Capture quick thoughts…"
              rows={5}
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
            />
            <div className="bookmark-modal-note-actions">
              <div className="bookmark-modal-note-status">
                {isSaving ? "Saving…" : dirty ? "Unsaved changes" : "Saved"}
              </div>
              <button
                type="button"
                className="bookmark-modal-note-save"
                disabled={!dirty || isSaving}
                onClick={handleSave}
              >
                Save Notes
              </button>
            </div>
          </div>

          <div className="bookmark-modal-actions">
            <button
              className="bookmark-modal-action"
              onClick={() => {
                if (item.url) {
                  window.open(item.url, '_blank');
                }
              }}
            >
              Open Link
            </button>
            <button className="bookmark-modal-delete" onClick={onDelete}>
              Delete
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
