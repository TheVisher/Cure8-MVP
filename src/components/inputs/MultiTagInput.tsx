"use client";

import React from "react";

import { toSlug } from "@/src/lib/slug";

type MultiTagInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
};

const normalizeTag = (raw: string) => toSlug(raw || "");

export default function MultiTagInput({ value, onChange, placeholder }: MultiTagInputProps) {
  const [inputValue, setInputValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const addTag = React.useCallback(
    (raw: string) => {
      const slug = normalizeTag(raw);
      if (!slug) return;
      if (value.includes(slug)) {
        setInputValue("");
        return;
      }
      onChange([...value, slug]);
      setInputValue("");
    },
    [onChange, value],
  );

  const removeTag = React.useCallback(
    (slug: string) => {
      onChange(value.filter((tag) => tag !== slug));
    },
    [onChange, value],
  );

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (event.key === "Backspace" && !inputValue) {
      const clone = [...value];
      const last = clone.pop();
      if (last) {
        onChange(clone);
      }
    }
  };

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const raw = event.target.value;
    if (raw.includes(",")) {
      const parts = raw.split(",");
      const last = parts.pop();
      parts.forEach((part) => addTag(part));
      setInputValue(last ?? "");
    } else {
      setInputValue(raw);
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div
      className="flex min-h-[2.75rem] flex-wrap items-center gap-1 rounded-xl border border-violet-500/30 bg-black/30 px-2 py-2"
      onClick={handleContainerClick}
      role="group"
      aria-label="Tags input"
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-lg bg-violet-600/30 px-2 py-1 text-xs font-medium text-violet-200 shadow-sm"
        >
          <span>{tag}</span>
          <button
            type="button"
            aria-label={`Remove tag ${tag}`}
            className="text-violet-200/70 transition hover:text-white"
            onClick={() => removeTag(tag)}
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : undefined}
        className="flex-1 min-w-[6rem] bg-transparent px-1 py-1 text-sm text-violet-100 placeholder:text-violet-400/40 focus:outline-none"
      />
    </div>
  );
}
