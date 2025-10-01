'use client';

import React from "react";
import { createPortal } from "react-dom";

export type CollectionEditorPopoverProps = {
  open: boolean;
  mode: "create" | "rename";
  anchorEl: HTMLElement | null;
  initialName?: string;
  parentName?: string;
  onCancel: () => void;
  onSubmit: (name: string) => Promise<void> | void;
};

const PANEL_WIDTH = 340;
const PANEL_HEIGHT = 196;
const OFFSET = 16;
const GLOW_GREEN = "rgba(0, 186, 146, 0.45)";
const GLOW_RED = "rgba(229, 60, 81, 0.45)";

const PANEL_PADDING_X = 1.2;
const INPUT_MARGIN_REM = 0.45;
const panelStyle = (top: number, left: number): React.CSSProperties => ({
  position: "fixed",
  top,
  left,
  zIndex: 2000,
  width: `${PANEL_WIDTH}px`,
  padding: `0.55rem ${PANEL_PADDING_X}rem 1.15rem`,
  borderRadius: "20px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "linear-gradient(135deg, rgba(17,9,33,0.93), rgba(11,6,24,0.88))",
  boxShadow: "0 32px 90px rgba(124,58,237,0.35)",
  backdropFilter: "blur(28px)",
  color: "#fff",
});

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "2.3rem",
  borderRadius: "999px",
  border: "1px solid rgba(148,115,255,0.22)",
  background: "rgba(8,4,20,0.82)",
  color: "#fff",
  padding: "0 0.85rem",
  fontSize: "0.9rem",
  outline: "none",
  transition: "border-color 150ms ease, box-shadow 150ms ease",
  boxShadow: "0 0 0 1px rgba(124,58,237,0.2) inset",
  boxSizing: "border-box",
  display: "block",
};

const inputWrapperStyle: React.CSSProperties = {
  margin: `0 ${INPUT_MARGIN_REM}rem`,
};

const createGlyph = (char: string) => (
  <span className="text-[10px] opacity-80">{char}</span>
);

const hoverFactory = (glow: string) => ({
  onMouseEnter: (event: React.MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)";
    event.currentTarget.style.boxShadow = `0 0 18px ${glow}`;
  },
  onMouseLeave: (event: React.MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.style.backgroundColor = "transparent";
    event.currentTarget.style.boxShadow = "none";
  },
});

export function CollectionEditorPopover({
  open,
  mode,
  anchorEl,
  initialName = "",
  parentName,
  onCancel,
  onSubmit,
}: CollectionEditorPopoverProps) {
  const [mounted, setMounted] = React.useState(false);
  const [name, setName] = React.useState(initialName);
  const [error, setError] = React.useState<string | null>(null);
  const [position, setPosition] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    setName(initialName);
    setError(null);
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, [open, initialName]);

  const updatePosition = React.useCallback(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    let top = rect.bottom + OFFSET;
    let left = rect.right - PANEL_WIDTH;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < OFFSET) {
      left = Math.min(rect.left, viewportWidth - PANEL_WIDTH - OFFSET);
      left = Math.max(OFFSET, left);
    }

    if (left + PANEL_WIDTH + OFFSET > viewportWidth) {
      left = viewportWidth - PANEL_WIDTH - OFFSET;
    }

    if (top + PANEL_HEIGHT > viewportHeight) {
      top = rect.top - PANEL_HEIGHT - OFFSET;
      if (top < OFFSET) {
        top = viewportHeight - PANEL_HEIGHT - OFFSET;
      }
    }

    setPosition({ top, left });
  }, [anchorEl]);

  React.useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  React.useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  React.useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorEl?.contains(target)) return;
      onCancel();
    };
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, [open, onCancel, anchorEl]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }
    try {
      await onSubmit(trimmed);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save";
      setError(message);
    }
  };

  if (!mounted || !open || !anchorEl || typeof document === "undefined") {
    return null;
  }

  const cancelHover = hoverFactory(GLOW_RED);
  const createHover = hoverFactory(GLOW_GREEN);

  return createPortal(
    <div ref={panelRef} style={panelStyle(position.top, position.left)}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight">
            {mode === "create" ? "Create Collection" : "Rename Collection"}
          </h2>
          {parentName ? (
            <p className="text-xs text-text-tertiary">Parent: {parentName}</p>
          ) : null}
        </div>
        <div className="space-y-3">
          <label className="text-xs font-medium text-text-tertiary" htmlFor="collection-name-input">
            Collection name
          </label>
          <div style={inputWrapperStyle}>
            <input
              id="collection-name-input"
              ref={inputRef}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              style={inputStyle}
              placeholder="New collection"
              onFocus={(event) => {
                event.currentTarget.style.boxShadow = "0 0 0 2px rgba(139,92,246,0.48)";
                event.currentTarget.style.borderColor = "rgba(139,92,246,0.65)";
              }}
              onBlur={(event) => {
                event.currentTarget.style.boxShadow = "0 0 0 1px rgba(124,58,237,0.2) inset";
                event.currentTarget.style.borderColor = "rgba(148,115,255,0.22)";
              }}
            />
          </div>
          {error ? (
            <p style={inputWrapperStyle} className="text-xs text-rose-300">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex items-center justify-center gap-8 text-sm">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium text-white transition focus:outline-none"
            style={{ backgroundColor: "transparent", boxShadow: "none", border: "none" }}
            {...cancelHover}
          >
            {createGlyph("↩")}
            <span>Cancel</span>
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium text-white transition focus:outline-none"
            style={{ backgroundColor: "transparent", boxShadow: "none", border: "none" }}
            {...createHover}
          >
            {createGlyph("✚")}
            <span>{mode === "create" ? "Create" : "Save"}</span>
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
