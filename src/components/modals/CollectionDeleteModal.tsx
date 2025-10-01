'use client';

import React from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  collectionName: string;
  onCancel: () => void;
  onKeepChildren: () => void;
  onDeleteSubtree: () => void;
};

export function CollectionDeleteModal({ open, collectionName, onCancel, onKeepChildren, onDeleteSubtree }: Props) {
  React.useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-xl border border-white/10 bg-surface-secondary p-6 text-sm text-text-primary shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white">Delete collection</h2>
        <p className="mt-2 text-text-secondary">
          &ldquo;{collectionName}&rdquo; contains nested folders. What would you like to do with them?
        </p>
        <div className="mt-5 space-y-3">
          <button
            type="button"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-left hover:border-violet-400 hover:text-white"
            onClick={onKeepChildren}
          >
            Keep children (move up one level)
          </button>
          <button
            type="button"
            className="w-full rounded-lg border border-rose-500/40 bg-rose-600/20 px-4 py-3 text-left text-rose-200 hover:bg-rose-600/30"
            onClick={onDeleteSubtree}
          >
            Delete this folder and all children
          </button>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" className="text-sm text-text-secondary hover:text-white" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
