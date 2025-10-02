'use client';

import React, { Suspense } from "react";
import { closestCorners, DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useRouter, useSearchParams } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { BookmarkModal } from "@/components/BookmarkModal";
import { Card } from "@/components/Card";
import HomeScreen from "@/components/HomeScreen";
import SettingsScreen from "@/components/SettingsScreen";
import { Sidebar } from "@/components/Sidebar";
import ErrorBoundary from "@/src/components/ErrorBoundary";
import { MoveToCollection } from "@/src/components/pickers/MoveToCollection";
import { ToastViewport } from "@/src/components/modals/ToastViewport";
import { collectionsOrchestrator } from "@/src/lib/collectionsOrchestrator";
import { collectionTagSlug } from "@/src/lib/tags";
import type { Card as CardType, CardStatus } from "@/src/lib/types";
import { PREVIEW_SERVICE_URL } from "@/src/lib/env";
import { randomId } from "@/src/lib/id";
import { apiFetch, ApiError } from "@/src/lib/api";
import { sanitizeHtml } from "@/src/lib/sanitize";
import { isValidUrl } from "@/src/lib/validate";
import { useCardsStore } from "@/src/state/cardsStore";
import { useCollectionsStore } from "@/src/state/collectionsStore";
import { useToastStore } from "@/src/state/toastStore";

const SETTINGS_KEY = "cure8.settings";
const LAYOUT_KEY = "cure8.layout";

const defaultSettings = {
  autoFetchMetadata: true,
  showThumbnails: true,
  previewServiceUrl: PREVIEW_SERVICE_URL,
};

const LAYOUT_OPTIONS = [
  { id: "grid", label: "Grid" },
  { id: "masonry", label: "Masonry" },
  { id: "list", label: "List" },
  { id: "compact", label: "Compact" },
];

const CARDS_API_URL = "/api/cards";
const PAGE_LIMIT = 50;

const sanitizeOptional = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const cleaned = sanitizeHtml(value);
  return cleaned.length > 0 ? cleaned : null;
};

const buildCardsQuery = (cursor?: string) => {
  const params = new URLSearchParams();
  params.set("limit", String(PAGE_LIMIT));
  if (cursor) params.set("cursor", cursor);
  return `${CARDS_API_URL}?${params.toString()}`;
};

type BookmarkItem = {
  id: string;
  title: string;
  url: string;
  domain: string;
  image?: string | null;
  notes?: string | null;
  status: CardStatus;
  createdAt: number;
};

function safeHost(url: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const coerceStatus = (value: unknown): CardStatus => {
  if (typeof value === "string") {
    const normalized = value.toUpperCase();
    if (normalized === "READY" || normalized === "PENDING" || normalized === "ERROR") {
      return normalized;
    }
    if (normalized === "OK") return "READY";
  }
  return "PENDING";
};

const ensureStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  value.forEach((entry) => {
    if (typeof entry !== "string") return;
    const trimmed = entry.trim();
    if (trimmed) unique.add(trimmed);
  });
  return Array.from(unique);
};

function normalizeServerCard(card: any): CardType {
  const createdAt = card.createdAt
    ? typeof card.createdAt === "string"
      ? card.createdAt
      : new Date(card.createdAt).toISOString()
    : new Date().toISOString();
  const updatedAt = card.updatedAt
    ? typeof card.updatedAt === "string"
      ? card.updatedAt
      : new Date(card.updatedAt).toISOString()
    : createdAt;

  return {
    id: card.id,
    url: typeof card.url === "string" ? card.url : "",
    title: sanitizeOptional(card.title) ?? (typeof card.title === "string" ? card.title : card.url || null),
    notes: sanitizeOptional(card.notes),
    status: coerceStatus(card.status),
    tags: ensureStringArray(card.tags),
    collections: ensureStringArray(card.collections),
    createdAt,
    updatedAt,
    domain: typeof card.domain === "string" ? card.domain : safeHost(card.url),
    image: card.image ?? null,
    description: sanitizeOptional(card.description),
    metadata: card.metadata ?? null,
  };
}

function normalizeImportedCard(raw: any, index: number): CardType {
  const createdAtValue = raw?.createdAt;
  const createdAt = typeof createdAtValue === "string"
    ? createdAtValue
    : typeof createdAtValue === "number"
    ? new Date(createdAtValue).toISOString()
    : new Date(Date.now() - index).toISOString();
  const updatedAt = raw?.updatedAt && typeof raw.updatedAt === "string" ? raw.updatedAt : createdAt;

  return {
    id: typeof raw?.id === "string" ? raw.id : randomId(),
    url: typeof raw?.url === "string" ? raw.url : "",
    title: sanitizeOptional(raw?.title) ?? (typeof raw?.url === "string" ? raw.url : null),
    notes: sanitizeOptional(raw?.notes),
    status: coerceStatus(raw?.status ?? raw?.state),
    tags: ensureStringArray(raw?.tags),
    collections: ensureStringArray(raw?.collections),
    createdAt,
    updatedAt,
    domain: typeof raw?.domain === "string" ? raw.domain : safeHost(raw?.url),
    image: typeof raw?.image === "string" ? raw.image : null,
    description: sanitizeOptional(raw?.description),
    metadata: raw?.metadata ?? null,
  };
}

function toServerPayload(card: CardType) {
  return {
    title: sanitizeOptional(card.title),
    url: card.url,
    notes: sanitizeOptional(card.notes),
    status: card.status,
    tags: card.tags,
    collections: card.collections,
    domain: sanitizeOptional(card.domain),
    image: card.image,
    description: sanitizeOptional(card.description),
    metadata: card.metadata,
  };
}

const buildPreviewRequestUrl = (template: string, targetUrl: string) => {
  const safeTemplate = (template || "").trim();
  const fallback = defaultSettings.previewServiceUrl;
  const base = safeTemplate || fallback;
  const encoded = encodeURIComponent(targetUrl);
  if (base.includes("{{url}}")) {
    return base.replace(/\{\{url\}\}/g, encoded);
  }
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}url=${encoded}`;
};

function toBookmarkItem(card: CardType): BookmarkItem {
  return {
    id: card.id,
    title: card.title || card.url || "Untitled",
    url: card.url ?? "",
    domain: card.domain ?? safeHost(card.url),
    image: card.image ?? null,
    notes: card.notes ?? null,
    status: card.status ?? "READY",
    createdAt: Date.parse(card.createdAt ?? "") || Date.now(),
  };
}

function MainContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const cardsMap = useCardsStore((state) => state.cards);
  const cardsOrder = useCardsStore((state) => state.order);
  const cards = React.useMemo(
    () =>
      cardsOrder
        .map((id) => cardsMap[id])
        .filter((card): card is CardType => Boolean(card)),
    [cardsOrder, cardsMap],
  );
  const setCards = useCardsStore((state) => state.setCards);
  const upsertCard = useCardsStore((state) => state.upsertCard);
  const removeCard = useCardsStore((state) => state.removeCard);
  const selectedIds = useCardsStore((state) => state.selectedIds);
  const clearSelection = useCardsStore((state) => state.clearSelection);

  const applyServerCard = React.useCallback(
    (raw: any) => {
      const normalized = normalizeServerCard(raw);
      upsertCard(normalized);
      return normalized;
    },
    [upsertCard],
  );

  const showToast = useToastStore((state) => state.show);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },
  });
  const sensors = useSensors(pointerSensor);

  const [activeView, setActiveView] = React.useState(() => {
    const param = searchParams?.get("view");
    return param && typeof param === "string" ? param : "Home";
  });
  const [q, setQ] = React.useState(() => searchParams?.get("q") || "");
  const [settings, setSettings] = React.useState(defaultSettings);
  const [layoutMode, setLayoutMode] = React.useState(() => {
    const urlLayout = searchParams?.get("layout");
    if (urlLayout && LAYOUT_OPTIONS.some((option) => option.id === urlLayout)) {
      return urlLayout;
    }
    return "grid";
  });
  const [showDetailsModal, setShowDetailsModal] = React.useState(false);
  const [focusedCardId, setFocusedCardId] = React.useState<string | null>(null);
  const [movePickerOpen, setMovePickerOpen] = React.useState(false);
  const [activeCollectionId, setActiveCollectionId] = React.useState<string | null>(null);
  const [collectionFilterSlug, setCollectionFilterSlug] = React.useState<string | null>(null);
  const [activeDragIds, setActiveDragIds] = React.useState<string[]>([]);
  const [activeDragCard, setActiveDragCard] = React.useState<CardType | null>(null);
  const metadataAbortRef = React.useRef<AbortController | null>(null);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [initialLoadError, setInitialLoadError] = React.useState<string | null>(null);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [loadMoreError, setLoadMoreError] = React.useState<string | null>(null);
  const [deletingCardId, setDeletingCardId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LAYOUT_KEY, layoutMode);
    } catch {}
  }, [layoutMode]);

  React.useEffect(() => () => {
    metadataAbortRef.current?.abort();
  }, []);

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.key === "m" || event.key === "M") && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (selectedIds.length === 0) return;
        event.preventDefault();
        setMovePickerOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIds]);

  const sortedByRecency = React.useMemo(() => {
    return [...cards].sort((a, b) => {
      const aTime = Date.parse(a.createdAt ?? "");
      const bTime = Date.parse(b.createdAt ?? "");
      return (isNaN(bTime) ? 0 : bTime) - (isNaN(aTime) ? 0 : aTime);
    });
  }, [cards]);

  const filtered = React.useMemo(() => {
    const search = q.toLowerCase();
    const matchesSearch = (card: CardType) => {
      const title = (card.title || "").toLowerCase();
      const domain = (card.domain || "").toLowerCase();
      const url = (card.url || "").toLowerCase();
      return !search || title.includes(search) || domain.includes(search) || url.includes(search);
    };

    const matchesCollection = (card: CardType) => {
      if (!collectionFilterSlug) return true;
      return Array.isArray(card.tags) && card.tags.includes(collectionFilterSlug);
    };

    if (activeView === "Recent") {
      return sortedByRecency.filter(matchesSearch).filter(matchesCollection).slice(0, 50);
    }

    return sortedByRecency.filter(matchesSearch).filter(matchesCollection);
  }, [sortedByRecency, q, activeView, collectionFilterSlug]);

  const focusOmnibox = React.useCallback(() => {
    if (typeof document === "undefined") return;
    const input = document.querySelector('input[placeholder*="Paste a URL"]') as HTMLInputElement | null;
    if (input) {
      input.focus();
      input.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const handleViewChange = React.useCallback(
    (view: string) => {
      const newUrl = view === "Home" ? "/" : `/?view=${view}`;
      router.push(newUrl, { scroll: false });
      setActiveView(view);
      if (view !== "All") {
        setCollectionFilterSlug(null);
        setActiveCollectionId(null);
      }
    },
    [router],
  );

  const handleLayoutChange = React.useCallback((mode: string) => {
    setLayoutMode(mode);
  }, []);

  const handleSearch = React.useCallback((query: string) => {
    setQ(query);
  }, []);

  const handleAddUrl = React.useCallback(
    async (rawUrl: string) => {
      const url = rawUrl.trim();
      if (!url) return;
      if (!isValidUrl(url)) {
        showToast({ message: "Please enter a valid URL", kind: "danger" });
        return;
      }

      const finalizeReady = async (cardId: string, updates: Record<string, unknown> = {}) => {
        const payload: Record<string, unknown> & { status: string } = { status: "READY" };
        if ("title" in updates) {
          const cleaned = sanitizeOptional(updates.title);
          payload.title = cleaned ?? null;
        }
        if ("notes" in updates) {
          const cleaned = sanitizeOptional(updates.notes);
          payload.notes = cleaned ?? null;
        }
        if ("tags" in updates && Array.isArray(updates.tags)) {
          payload.tags = updates.tags;
        }
        if ("collections" in updates && Array.isArray(updates.collections)) {
          payload.collections = updates.collections;
        }

        try {
          const response = await apiFetch(`${CARDS_API_URL}/${cardId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          applyServerCard(await response.json());
        } catch (error) {
          const current = useCardsStore.getState().cards[cardId];
          if (current) {
            const nextCard: CardType = {
              ...current,
              ...("title" in payload ? { title: (payload.title as string | null) ?? null } : {}),
              ...("notes" in payload ? { notes: (payload.notes as string | null) ?? null } : {}),
              ...("tags" in payload ? { tags: payload.tags as string[] } : {}),
              status: "READY",
              updatedAt: new Date().toISOString(),
            };
            upsertCard(nextCard);
          }
          throw error;
        }
      };

      try {
        const createResponse = await apiFetch(CARDS_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            status: settings.autoFetchMetadata ? "PENDING" : "READY",
          }),
        });

        const createdCard = applyServerCard(await createResponse.json());

        if (!settings.autoFetchMetadata) return;

        const controller = new AbortController();
        metadataAbortRef.current?.abort();
        metadataAbortRef.current = controller;

        const requestUrl = buildPreviewRequestUrl(settings.previewServiceUrl, url);
        const timeoutId = window.setTimeout(() => controller.abort(), 10000);

        const dedupeStrings = (values: unknown): string[] => {
          if (!Array.isArray(values)) return [];
          const unique = new Set<string>();
          values.forEach((value) => {
            if (typeof value !== "string") return;
            const trimmed = value.trim();
            if (trimmed) unique.add(trimmed);
          });
          return Array.from(unique);
        };

        try {
          const response = await fetch(requestUrl, {
            signal: controller.signal,
            mode: "cors",
          });

          window.clearTimeout(timeoutId);

          if (!response.ok) throw new Error(`Preview service responded with ${response.status}`);
          const metadata = await response.json();

          const payload: Record<string, unknown> = {};
          const derivedTitle =
            sanitizeOptional(metadata?.title) ?? createdCard.title ?? createdCard.url;
          if (derivedTitle) payload.title = derivedTitle;

          const notesContent =
            sanitizeOptional(metadata?.notes) ?? sanitizeOptional(metadata?.description);
          if (notesContent) payload.notes = notesContent;

          const tags = dedupeStrings(metadata?.tags);
          if (tags.length > 0) payload.tags = tags;

          await finalizeReady(createdCard.id, payload);
        } catch (previewError) {
          window.clearTimeout(timeoutId);

          if (controller.signal.aborted || (previewError instanceof DOMException && previewError.name === "AbortError")) {
            await finalizeReady(createdCard.id).catch(() => {});
            return;
          }

          console.warn(
            "Preview service unavailable, bookmark saved without metadata:",
            previewError instanceof Error ? previewError.message : previewError,
          );

          await finalizeReady(createdCard.id).catch((error) => {
            console.warn("Failed to update card status", error);
          });
        } finally {
          if (metadataAbortRef.current === controller) {
            metadataAbortRef.current = null;
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Failed to add card", error);
        const message = error instanceof ApiError ? error.message : error instanceof Error ? error.message : "Unable to add card";
        showToast({ message, kind: "danger" });
      }
    },
    [applyServerCard, settings.autoFetchMetadata, settings.previewServiceUrl, showToast, upsertCard],
  );

  const loadCardsPage = React.useCallback(
    async (cursor?: string) => {
      const response = await apiFetch(buildCardsQuery(cursor), { cache: "no-store" });
      const body = await response.json();
      const items = Array.isArray(body.items) ? body.items : [];
      const normalized = items.map(normalizeServerCard);
      const next = typeof body.nextCursor === "string" && body.nextCursor.length > 0 ? body.nextCursor : null;
      return { cards: normalized, nextCursor: next };
    },
    [],
  );

  React.useEffect(() => {
    let cancelled = false;
    setInitialLoading(true);
    loadCardsPage()
      .then(({ cards: pageCards, nextCursor: cursor }) => {
        if (cancelled) return;
        setCards(pageCards);
        setNextCursor(cursor);
        setInitialLoadError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load cards", error);
        const message = error instanceof ApiError || error instanceof Error ? error.message : "Unable to load cards";
        setInitialLoadError(message);
      })
      .finally(() => {
        if (!cancelled) setInitialLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadCardsPage, setCards]);

  const handleLoadMore = React.useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const { cards: pageCards, nextCursor: cursor } = await loadCardsPage(nextCursor);
      if (pageCards.length > 0) {
        const existing = useCardsStore.getState().list();
        const existingIds = new Set(existing.map((card) => card.id));
        const merged = [...existing];
        pageCards.forEach((card: CardType) => {
          if (!existingIds.has(card.id)) {
            merged.push(card);
            existingIds.add(card.id);
          }
        });
        setCards(merged);
      }
      setNextCursor(cursor);
    } catch (error) {
      console.error("Failed to load more cards", error);
      const message = error instanceof ApiError ? error.message : error instanceof Error ? error.message : "Unable to load more cards";
      setLoadMoreError(message);
      showToast({ message, kind: "danger" });
    } finally {
      setLoadingMore(false);
    }
  }, [loadCardsPage, loadingMore, nextCursor, setCards, showToast]);

  const handleCardClick = React.useCallback(
    (cardId: string) => {
      setFocusedCardId(cardId);
      setShowDetailsModal(true);
    },
    [],
  );

  const handleDeleteItem = React.useCallback(
    async (cardId: string) => {
      const card = cardsMap[cardId];
      if (!card) return;
      if (!window.confirm(`Are you sure you want to delete "${card.title ?? card.url}"?`)) return;

      try {
        setDeletingCardId(cardId);
        await apiFetch(`${CARDS_API_URL}/${cardId}`, { method: "DELETE" });

        removeCard(cardId);
        if (showDetailsModal) {
          setShowDetailsModal(false);
          setFocusedCardId(null);
        }
        showToast({ message: "Card deleted", kind: "success", durationMs: 2000 });
      } catch (error) {
        console.error("Failed to delete card", error);
        const message = error instanceof ApiError ? error.message : error instanceof Error ? error.message : "Unable to delete card";
        showToast({ message, kind: "danger" });
      } finally {
        setDeletingCardId(null);
      }
    },
    [cardsMap, removeCard, showDetailsModal, showToast],
  );

  const handleUpdateNotes = React.useCallback(
    async (id: string, notes: string) => {
      try {
        const response = await apiFetch(`${CARDS_API_URL}/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: sanitizeOptional(notes) ?? null }),
        });
        applyServerCard(await response.json());
      } catch (error) {
        console.error("Failed to update notes", error);
        const message = error instanceof ApiError ? error.message : error instanceof Error ? error.message : "Unable to update notes";
        showToast({ message, kind: "danger" });
      }
    },
    [applyServerCard, showToast],
  );

  const handleExport = React.useCallback(() => {
    const dataStr = JSON.stringify(cards, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cure8-bookmarks-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [cards]);

  const handleImport = React.useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const importedItems = JSON.parse(evt.target?.result as string);
          if (!Array.isArray(importedItems)) {
            alert("Invalid file format. Please select a valid Cure8 export file.");
            return;
          }
          const normalized = importedItems.map(normalizeImportedCard);
          let successCount = 0;

          for (const entry of normalized) {
            try {
              const response = await apiFetch(CARDS_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...toServerPayload(entry),
                  createdAt: entry.createdAt,
                  updatedAt: entry.updatedAt,
                }),
              });
              applyServerCard(await response.json());
              successCount += 1;
            } catch (error) {
              console.error("Failed to import card", error);
              showToast({
                message: error instanceof ApiError ? error.message : error instanceof Error ? error.message : "Unable to import card",
                kind: "danger",
              });
            }
          }

          alert(`Successfully imported ${successCount} bookmark${successCount === 1 ? "" : "s"}!`);
        } catch (error) {
          console.error("Error reading import file", error);
          alert("Error reading file. Please make sure it's a valid JSON file.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [applyServerCard, showToast]);

  const handleClearData = React.useCallback(async () => {
    if (!window.confirm("Clear all saved bookmarks? This cannot be undone.")) return;

    try {
      await apiFetch(CARDS_API_URL, { method: "DELETE" });

      setCards([]);
      clearSelection();
      setShowDetailsModal(false);
      setFocusedCardId(null);
      showToast({ message: "All cards cleared", kind: "success", durationMs: 2000 });
    } catch (error) {
      console.error("Failed to clear cards", error);
      const message = error instanceof ApiError ? error.message : error instanceof Error ? error.message : "Unable to clear cards";
      showToast({ message, kind: "danger" });
    }
  }, [clearSelection, setCards, showToast]);

  const handleAssignToCollection = React.useCallback(
    async (cardIds: string[], collectionId: string) => {
      const collections = useCollectionsStore.getState().collections;
      const collection = collections[collectionId];
      if (!collection) return;

      const slug = collectionTagSlug(collection);
      const currentCards = useCardsStore.getState().cards;

      const targets = cardIds
        .map((cardId) => {
          const card = currentCards[cardId];
          if (!card) return null;
          if (card.tags.includes(slug)) return null;
          return {
            cardId,
            tags: Array.from(new Set([...card.tags, slug])),
            collections: Array.from(new Set([...(card.collections ?? []), slug])),
          };
        })
        .filter(Boolean) as { cardId: string; tags: string[]; collections: string[] }[];

      if (targets.length === 0) {
        showToast({ message: `Already in "${collection.name}"`, durationMs: 2500 });
        return;
      }

      try {
        const updatedCards = await Promise.all(
          targets.map(async ({ cardId, tags, collections: nextCollections }) => {
            const response = await apiFetch(`${CARDS_API_URL}/${cardId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tags, collections: nextCollections }),
            });

            return applyServerCard(await response.json());
          }),
        );

        const undo = async () => {
          try {
            await Promise.all(
              updatedCards.map(async (card) => {
                const latest = useCardsStore.getState().cards[card.id];
                if (!latest) return;
                const nextTags = latest.tags.filter((value) => value !== slug);
                const nextCollections = (latest.collections ?? []).filter((value) => value !== slug);
                const response = await apiFetch(`${CARDS_API_URL}/${card.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ tags: nextTags, collections: nextCollections }),
                });
                applyServerCard(await response.json());
              }),
            );
          } catch (error) {
            console.error("Failed to undo collection assignment", error);
            const message =
              error instanceof ApiError || error instanceof Error
                ? error.message
                : `Couldn't undo move for "${collection.name}"`;
            showToast({ message, kind: "danger" });
          }
        };

        showToast({
          message:
            updatedCards.length > 1
              ? `Moved ${updatedCards.length} cards to "${collection.name}"`
              : `Moved to "${collection.name}"`,
          actionLabel: "Undo",
          onAction: () => {
            void undo();
          },
          durationMs: 5000,
        });
      } catch (error) {
        console.error("Failed to assign cards to collection", error);
        const message =
          error instanceof ApiError || error instanceof Error
            ? error.message
            : `Couldn't move cards to "${collection.name}"`;
        showToast({ message, kind: "danger" });
      }
    },
    [applyServerCard, showToast],
  );

  const handleCollectionSelect = React.useCallback((collectionId: string) => {
    setActiveCollectionId(collectionId);
    const collection = useCollectionsStore.getState().collections[collectionId];
    if (collection) {
      setCollectionFilterSlug(collection.slug);
      setActiveView("All");
    } else {
      setCollectionFilterSlug(null);
    }
  }, []);

  const handleDragStart = React.useCallback(
    (event: DragStartEvent) => {
      if (event.active.data.current?.type !== "card") return;
      const cardId = event.active.data.current.cardId as string;
      setActiveDragIds([cardId]);
      const stateCards = useCardsStore.getState().cards;
      setActiveDragCard(stateCards[cardId] ?? null);
    },
    [],
  );

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { over } = event;
      const dragIds = activeDragIds.length > 0 ? activeDragIds : selectedIds;
      setActiveDragIds([]);
      setActiveDragCard(null);

      if (!over || over.data.current?.type !== "collection") return;
      if (dragIds.length === 0) return;

      const collectionId = over.data.current.collectionId as string;
      handleAssignToCollection(dragIds, collectionId);
    },
    [activeDragIds, handleAssignToCollection, selectedIds],
  );

  const handleDragCancel = React.useCallback(() => {
    setActiveDragIds([]);
    setActiveDragCard(null);
  }, []);

  const focusedCard = focusedCardId ? cardsMap[focusedCardId] : null;

  let content: React.ReactNode;
  if (activeView === "settings") {
    content = (
      <SettingsScreen
        settings={settings}
        defaultSettings={defaultSettings}
        onUpdateSettings={(partial) => setSettings((prev) => ({ ...prev, ...partial }))}
        onResetSettings={() => setSettings({ ...defaultSettings })}
        onExport={handleExport}
        onImport={handleImport}
        onClearData={handleClearData}
        itemCount={cards.length}
      />
    );
  } else if (activeView === "Home") {
    const pendingCount = cards.filter((card) => card.status === "PENDING").length;
    const errorCount = cards.filter((card) => card.status === "ERROR").length;
    const okCount = cards.length - pendingCount - errorCount;
    const recentItems = sortedByRecency.slice(0, 6).map(toBookmarkItem);

    content = (
      <HomeScreen
        totalItems={cards.length}
        readyItems={okCount}
        pendingItems={pendingCount}
        errorItems={errorCount}
        recentItems={recentItems}
        onQuickAdd={focusOmnibox}
        onImport={handleImport}
        onOpenSettings={() => handleViewChange("settings")}
        onGoToLibrary={() => handleViewChange("All")}
        onSelectBookmark={(item) => handleCardClick(item.id)}
        showThumbnails={settings.showThumbnails}
      />
    );
  } else if (activeView === "help") {
    content = (
      <div className="bg-surface border border-white/10 rounded-card p-6 text-text-secondary">
        <h2 className="text-xl font-bold text-text-primary mb-3">Help</h2>
        <p className="text-sm">
          We are working on curated tips and documentation. For now, reach out to support@cure8.com if you need a hand.
        </p>
      </div>
    );
  } else {
    const showLoadingState = initialLoading && filtered.length === 0;
    const showEmptyState = !initialLoading && filtered.length === 0;

    content = (
      <>
        <div className="layout-toolbar">
          <span className="layout-label">Layout</span>
          <div className="layout-toggle">
            {LAYOUT_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={["layout-toggle-btn", layoutMode === option.id ? "is-active" : ""].join(" ")}
                onClick={() => handleLayoutChange(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {initialLoadError ? (
          <div className="cards-error-banner">{initialLoadError}</div>
        ) : null}

        {showLoadingState ? (
          <div className="cards-loading">Loading cards…</div>
        ) : showEmptyState ? (
          <div className="cards-empty">No cards found.</div>
        ) : layoutMode === "list" ? (
          <div className="bookmark-list">
            {filtered.map((card) => (
              <Card
                key={card.id}
                id={card.id}
                title={card.title}
                domain={card.domain}
                image={settings.showThumbnails ? card.image ?? undefined : undefined}
                status={card.status}
                onClick={() => handleCardClick(card.id)}
                layout={layoutMode as any}
                url={card.url ?? ""}
              />
            ))}
          </div>
        ) : (
          <div className={["bookmark-grid", layoutMode === "masonry" ? "masonry" : "", layoutMode === "compact" ? "compact" : ""].filter(Boolean).join(" ")}>
            {filtered.map((card) => (
              <Card
                key={card.id}
                id={card.id}
                title={card.title}
                domain={card.domain}
                image={settings.showThumbnails ? card.image ?? undefined : undefined}
                status={card.status}
                onClick={() => handleCardClick(card.id)}
                layout={layoutMode as any}
                url={card.url ?? ""}
              />
            ))}
          </div>
        )}

        {nextCursor && activeView !== "Recent" ? (
          <div className="cards-load-more">
            <button type="button" onClick={handleLoadMore} disabled={loadingMore} aria-busy={loadingMore}>
              {loadingMore ? "Loading…" : "Load more"}
            </button>
            {loadMoreError ? <div className="cards-load-more-error">{loadMoreError}</div> : null}
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      <AppShell
        sidebar={
          <Sidebar
            active={activeView}
            onChange={handleViewChange}
            onSelectCollection={handleCollectionSelect}
            activeCollectionId={activeCollectionId}
          />
        }
        onSearch={handleSearch}
        onAddUrl={handleAddUrl}
      >
        <ErrorBoundary fallback={<div className="cards-error-banner">We hit a rendering snag. Try again.</div>}>
          <DndContext
            collisionDetection={closestCorners}
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            {content}
            <DragOverlay>
              {activeDragCard ? (
                <div className="drag-overlay">
                  <div className="drag-overlay-heading">{activeDragCard.title || activeDragCard.url || "Untitled"}</div>
                  {activeDragCard.domain ? (
                    <div className="drag-overlay-domain">{activeDragCard.domain}</div>
                  ) : null}
                  {activeDragIds.length > 1 ? (
                    <div className="drag-overlay-count">+{activeDragIds.length - 1}</div>
                  ) : null}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </ErrorBoundary>

        {showDetailsModal && focusedCard ? (
          <BookmarkModal
            item={{
              id: focusedCard.id,
              title: focusedCard.title || focusedCard.url || "Untitled",
              url: focusedCard.url ?? "",
              domain: focusedCard.domain ?? safeHost(focusedCard.url),
              image: focusedCard.image ?? null,
              description: focusedCard.description ?? "",
              notes: focusedCard.notes ?? "",
              createdAt: Date.parse(focusedCard.createdAt ?? "") || Date.now(),
            }}
            onClose={() => setShowDetailsModal(false)}
            onDelete={() => handleDeleteItem(focusedCard.id)}
            onUpdateNotes={handleUpdateNotes}
            deleting={deletingCardId === focusedCard.id}
          />
        ) : null}
      </AppShell>

      <MoveToCollection
        open={movePickerOpen}
        onClose={() => setMovePickerOpen(false)}
        onSelect={(collection) => handleAssignToCollection(selectedIds, collection.id)}
      />

      <ToastViewport />
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="p-8 text-white">Loading...</div>}>
      <MainContent />
    </Suspense>
  );
}
