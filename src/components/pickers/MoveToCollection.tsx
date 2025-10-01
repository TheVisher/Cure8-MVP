'use client';

import React from "react";
import { createPortal } from "react-dom";

import { useCollectionsStore } from "@/src/state/collectionsStore";
import type { Collection, ID } from "@/src/lib/types";

export type MoveToCollectionProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (collection: Collection) => void;
};

function buildOrderedList(collections: Record<ID, Collection>, order: ID[]) {
  return order
    .map((id) => collections[id])
    .filter((collection): collection is Collection => Boolean(collection));
}

export function MoveToCollection({ open, onClose, onSelect }: MoveToCollectionProps) {
  const collections = useCollectionsStore((state) => state.collections);
  const order = useCollectionsStore((state) => state.order);

  const orderedCollections = React.useMemo(() => buildOrderedList(collections, order), [collections, order]);

  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? orderedCollections.filter((collection) => collection.name.toLowerCase().includes(normalizedQuery))
    : orderedCollections;

  return createPortal(
    <div className="fixed inset-0 z-[998] flex items-center justify-center bg-black/50 backdrop-blur" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-white/10 bg-surface-secondary p-5 text-sm text-text-primary shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3">
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Move selected cards to..."
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-xs text-text-tertiary">No matching collections.</p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((collection) => (
                <li key={collection.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-text-secondary hover:bg-white/10 hover:text-white"
                    onClick={() => {
                      onSelect(collection);
                      onClose();
                    }}
                  >
                    <span>{collection.name}</span>
                    <span className="text-xs text-text-tertiary">{collection.slug}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
