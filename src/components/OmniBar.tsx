"use client";

import React from "react";

import AddCardModal from "./modals/AddCardModal";

type OmniBarProps = {
  onSearch: (q: string) => void;
  onAddUrl: (url: string) => void;
};

const isProbablyUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const candidate = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const parsed = new URL(candidate);
    return Boolean(parsed.hostname && parsed.hostname.includes("."));
  } catch {
    return /\w+\.\w{2,}/.test(trimmed);
  }
};

export default function OmniBar({ onSearch, onAddUrl }: OmniBarProps) {
  const [query, setQuery] = React.useState("");
  const [showModal, setShowModal] = React.useState(false);
  const [modalUrl, setModalUrl] = React.useState<string | undefined>(undefined);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const isUrl = React.useMemo(() => isProbablyUrl(query), [query]);

  React.useEffect(() => {
    if (!isUrl) {
      const handle = setTimeout(() => onSearch(query), 220);
      return () => clearTimeout(handle);
    }
    return undefined;
  }, [query, isUrl, onSearch]);

  const openModal = React.useCallback(
    (initial?: string) => {
      const trimmed = initial?.trim();
      setModalUrl(trimmed ? trimmed : undefined);
      setShowModal(true);
    },
    [],
  );

  const closeModal = React.useCallback(() => {
    setShowModal(false);
    setModalUrl(undefined);
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const submit = React.useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;

    if (isProbablyUrl(trimmed)) {
      onAddUrl(trimmed);
      setQuery("");
    } else {
      onSearch(trimmed);
    }
  }, [query, onAddUrl, onSearch]);

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === "Enter") {
      if (event.shiftKey) {
        event.preventDefault();
        openModal(query);
        return;
      }
      event.preventDefault();
      submit();
    }

    if (event.key === "Escape") {
      setQuery("");
    }
  };

  return (
    <div className="omni-root">
      <div className="relative omni-container">
        <input
          ref={inputRef}
          className="omni-input pr-16"
          placeholder="Paste a URL to add, or type to search…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          title="Add with options"
          onClick={() => openModal()}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-sm font-semibold text-violet-300/80 transition hover:bg-white/5 hover:text-white"
        >
          +
        </button>
      </div>
      <div className="omni-glow" aria-hidden="true" />
      <p className="mt-2 text-xs text-violet-200/60">Enter = Quick Add • Shift+Enter = Add with options</p>

      <AddCardModal
        open={showModal}
        onClose={closeModal}
        initialUrl={modalUrl}
        onSave={(data) => {
          console.log("AddCardModal from OmniBar", data);
        }}
      />
    </div>
  );
}
