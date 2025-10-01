'use client';

import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { useCardsStore } from "@/src/state/cardsStore";

function safeHost(link: string) {
  if (!link) return "";
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

type CardProps = {
  id: string;
  title: string;
  domain?: string;
  image?: string;
  state?: "ok" | "pending" | "error";
  onClick: () => void;
  layout?: "grid" | "masonry" | "list" | "compact";
  url: string;
};

export function Card({ id, title, domain, image, state = "ok", onClick, layout = "grid", url }: CardProps) {
  const selectedIds = useCardsStore((store) => store.selectedIds);
  const selectOnly = useCardsStore((store) => store.selectOnly);
  const toggleSelect = useCardsStore((store) => store.toggleSelect);
  const selectRange = useCardsStore((store) => store.selectRange);
  const setSelection = useCardsStore((store) => store.setSelection);

  const isSelected = selectedIds.includes(id);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `card:${id}`,
    data: {
      type: "card",
      cardId: id,
    },
  });

  const style: React.CSSProperties = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    opacity: isDragging ? 0 : 1,
    border: isSelected ? "1px solid rgba(139, 92, 246, 0.6)" : undefined,
  };

  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (event.button !== 0) return;

    if (event.shiftKey) {
      event.preventDefault();
      selectRange(id);
    } else if (event.metaKey || event.ctrlKey) {
      event.preventDefault();
      toggleSelect(id);
    } else if (!isSelected) {
      selectOnly(id);
    } else {
      setSelection(selectedIds);
    }

    listeners.onPointerDown?.(event);
  };

  const handleClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
    if (event.shiftKey || event.metaKey || event.ctrlKey) return;
    onClick();
  };

  const showSkeleton = state === "pending";

  const displayTitle = title?.trim() || url || domain || "Untitled";
  const displayDomain = domain || safeHost(url) || "";
  const displayUrl = url || "";
  const placeholderText = (displayDomain || displayTitle || "link")
    .replace(/^https?:\/\//, "")
    .slice(0, 2)
    .toUpperCase();

  const statusLabel =
    state === "pending" ? "Fetching" : state === "error" ? "Needs attention" : "Ready";
  const statusClass =
    state === "pending"
      ? "bookmark-list-status bookmark-list-status--pending"
      : state === "error"
      ? "bookmark-list-status bookmark-list-status--error"
      : "bookmark-list-status bookmark-list-status--ok";

  if (layout === "list") {
    return (
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        role="button"
        className={[
          "bookmark-list-item",
          isSelected ? "is-selected" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={style}
      >
        <div className="bookmark-list-thumb">
          {showSkeleton ? (
            <div className="bookmark-list-thumb-skeleton" />
          ) : image ? (
            <img src={image} alt="" />
          ) : (
            <div className="bookmark-list-thumb-placeholder">{placeholderText}</div>
          )}
        </div>

        <div className="bookmark-list-col bookmark-list-col--title">
          <span className="bookmark-list-name" title={displayTitle}>
            {displayTitle}
          </span>
          <span className="bookmark-list-domain" title={displayDomain}>
            {displayDomain}
          </span>
        </div>

        <div className="bookmark-list-col bookmark-list-col--url">
          {displayUrl ? (
            <span className="bookmark-list-url" title={displayUrl}>
              {displayUrl}
            </span>
          ) : (
            <span className="bookmark-list-url bookmark-list-url--empty">No URL</span>
          )}
        </div>

        <span className={statusClass}>{statusLabel}</span>
        <div className="bookmark-list-open" aria-hidden="true">
          &rsaquo;
        </div>
      </div>
    );
  }

  const isMasonry = layout === "masonry";
  const isCompact = layout === "compact";

  const cardClasses = ["bookmark-card", "group"];
  if (isMasonry) cardClasses.push("bookmark-card--masonry");
  if (isCompact) cardClasses.push("bookmark-card--compact");
  if (isSelected) cardClasses.push("bookmark-card--selected");

  const contentClasses = ["bookmark-card-content"];
  if (isMasonry) contentClasses.push("bookmark-card-content--masonry");
  if (isCompact) contentClasses.push("bookmark-card-content--compact");

  const mediaClasses = ["bookmark-card-media"];
  if (!isMasonry && !isCompact) mediaClasses.push("aspect-[4/5]");
  if (isMasonry) mediaClasses.push("bookmark-card-media--masonry");
  if (isCompact) mediaClasses.push("bookmark-card-media--compact");

  const bodyClasses = ["bookmark-card-body"];
  if (isCompact) bodyClasses.push("bookmark-card-body--compact");

  const frameClasses = ["bookmark-card-frame"];
  if (isCompact) frameClasses.push("bookmark-card-frame--compact");
  if (isMasonry) frameClasses.push("bookmark-card-frame--masonry");

  const glowClasses = ["bookmark-card-glow"];
  if (isCompact) glowClasses.push("bookmark-card-glow--compact");
  if (isMasonry) glowClasses.push("bookmark-card-glow--masonry");

  const skeletonClasses = ["bookmark-card-skeleton"];
  if (isMasonry) skeletonClasses.push("bookmark-card-skeleton--masonry");
  if (isCompact) skeletonClasses.push("bookmark-card-skeleton--compact");

  const placeholderClasses = ["bookmark-card-placeholder"];
  if (isMasonry) placeholderClasses.push("bookmark-card-placeholder--masonry");
  if (isCompact) placeholderClasses.push("bookmark-card-placeholder--compact");

  const placeholderContent = displayDomain || placeholderText || "link";

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      className={cardClasses.join(" ")}
    >
      <div className={contentClasses.join(" ")}>
        <div className={mediaClasses.join(" ")}>
          {showSkeleton ? (
            <div className={skeletonClasses.join(" ")} />
          ) : image ? (
            <img src={image} alt="" className={isMasonry ? "w-full h-auto" : "h-full w-full object-cover"} />
          ) : (
            <div className={placeholderClasses.join(" ")}>
              {placeholderContent}
            </div>
          )}
          <div className={frameClasses.join(" ")} />
          <div className={glowClasses.join(" ")} />
        </div>

        <div className={bodyClasses.join(" ")}>
          <div className="bookmark-card-title">{displayTitle}</div>
          <div className="bookmark-card-domain">{displayDomain}</div>
        </div>
      </div>
    </div>
  );
}
