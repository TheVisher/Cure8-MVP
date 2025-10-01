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
import { MoveToCollection } from "@/src/components/pickers/MoveToCollection";
import { ToastViewport } from "@/src/components/modals/ToastViewport";
import { collectionsOrchestrator } from "@/src/lib/collectionsOrchestrator";
import { collectionTagSlug } from "@/src/lib/tags";
import type { Card as CardType, CardState } from "@/src/lib/types";
import { useCardsStore } from "@/src/state/cardsStore";
import { useCollectionsStore } from "@/src/state/collectionsStore";
import { useToastStore } from "@/src/state/toastStore";

const SETTINGS_KEY = "cure8.settings";
const LAYOUT_KEY = "cure8.layout";

const defaultSettings = {
  autoFetchMetadata: true,
  showThumbnails: true,
  previewServiceUrl: "http://localhost:8787/preview?url={{url}}",
};

const LAYOUT_OPTIONS = [
  { id: "grid", label: "Grid" },
  { id: "masonry", label: "Masonry" },
  { id: "list", label: "List" },
  { id: "compact", label: "Compact" },
];

const CARDS_API_URL = "/api/cards";

type BookmarkItem = {
  id: string;
  title: string;
  url: string;
  domain: string;
  image?: string | null;
  description: string;
  notes: string;
  state: CardState;
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

function normalizeServerCard(card: any): CardType {
  const createdAt = card.createdAt
    ? typeof card.createdAt === "string"
      ? card.createdAt
      : new Date(card.createdAt).toISOString()
    : new Date().toISOString();

  return {
    id: card.id,
    title: card.title || card.url || "Untitled",
    url: card.url || "",
    domain: card.domain || safeHost(card.url),
    image: card.image || null,
    description: card.description || "",
    notes: card.notes || "",
    state: (card.status as CardState) || "ok",
    createdAt,
    updatedAt: card.updatedAt ? new Date(card.updatedAt).toISOString() : undefined,
    tags: Array.isArray(card.tags) ? card.tags : [],
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

  return {
    id: typeof raw?.id === "string" ? raw.id : randomId(),
    title: typeof raw?.title === "string" ? raw.title : raw?.url || "Untitled",
    url: typeof raw?.url === "string" ? raw.url : "",
    domain: typeof raw?.domain === "string" ? raw.domain : safeHost(raw?.url),
    image: typeof raw?.image === "string" ? raw.image : null,
    description: typeof raw?.description === "string" ? raw.description : "",
    notes: typeof raw?.notes === "string" ? raw.notes : "",
    state: (raw?.state as CardState) || "ok",
    createdAt,
    updatedAt: raw?.updatedAt && typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
    tags: Array.isArray(raw?.tags) ? raw.tags.filter((tag: unknown) => typeof tag === "string") : [],
    metadata: raw?.metadata ?? null,
  };
}

function toServerPayload(card: CardType) {
  return {
    title: card.title,
    url: card.url,
    image: card.image ?? null,
    notes: card.notes ?? "",
    description: card.description ?? "",
    domain: card.domain ?? safeHost(card.url),
    status: card.state ?? "ok",
    metadata: card.metadata ?? null,
  };
}

const randomId = () => {
  try {
    if (typeof window !== "undefined" && window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
  } catch {}
  return `id_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
};

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
    title: card.title,
    url: card.url ?? "",
    domain: card.domain ?? safeHost(card.url),
    image: card.image ?? null,
    description: card.description ?? "",
    notes: card.notes ?? "",
    state: card.state ?? "ok",
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
  const bulkAssignTag = useCardsStore((state) => state.bulkAssignTag);
  const bulkRemoveTag = useCardsStore((state) => state.bulkRemoveTag);
  const selectedIds = useCardsStore((state) => state.selectedIds);
  const clearSelection = useCardsStore((state) => state.clearSelection);

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

  React.useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      try {
        const response = await fetch(CARDS_API_URL, { cache: "no-store" });
        if (!response.ok) throw new Error(`Failed with ${response.status}`);
        const data = await response.json();
        if (Array.isArray(data) && !cancelled) {
          const normalized = data.map(normalizeServerCard);
          setCards(normalized);
        }
      } catch (error) {
        console.error("Failed to load bookmarks from API", error);
      }
    };
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [setCards]);

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
    async (url: string) => {
      const id = randomId();
      const domain = (() => {
        try {
          return new URL(url).hostname.replace(/^www\./, "");
        } catch {
          return url;
        }
      })();

      const createdAt = new Date().toISOString();
      const newCard: CardType = {
        id,
        title: url,
        domain,
        url,
        description: "",
        notes: "",
        state: settings.autoFetchMetadata ? "pending" : "ok",
        image: null,
        createdAt,
        updatedAt: createdAt,
        tags: [],
        metadata: null,
      };

      upsertCard(newCard);

      await fetch(CARDS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          ...toServerPayload(newCard),
          createdAt,
        }),
      });

      if (!settings.autoFetchMetadata) return;

      try {
        const requestUrl = buildPreviewRequestUrl(settings.previewServiceUrl, url);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(requestUrl, {
          signal: controller.signal,
          mode: "cors",
        });

        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`Preview service responded with ${res.status}`);
        const meta = await res.json();

        const updatedCard: CardType = {
          ...newCard,
          title: meta.title || newCard.title,
          domain: meta.domain || newCard.domain,
          image: meta.cardImage || meta.heroImage || null,
          url: meta.url || newCard.url || url,
          description: meta.description || newCard.description || "",
          state: "ok",
          updatedAt: new Date().toISOString(),
        };

        upsertCard(updatedCard);

        await fetch(`${CARDS_API_URL}/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...toServerPayload(updatedCard),
            status: "ok",
          }),
        });
      } catch (error) {
        console.warn(
          "Preview service unavailable, bookmark saved without metadata:",
          error instanceof Error ? error.message : error,
        );
        upsertCard({ ...newCard, state: "ok" });
        await fetch(`${CARDS_API_URL}/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "ok" }),
        });
      }
    },
    [settings.autoFetchMetadata, settings.previewServiceUrl, upsertCard],
  );

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
      if (card && window.confirm(`Are you sure you want to delete "${card.title}"?`)) {
        removeCard(cardId);
        await fetch(`${CARDS_API_URL}/${cardId}`, { method: "DELETE" });
        if (showDetailsModal) {
          setShowDetailsModal(false);
          setFocusedCardId(null);
        }
      }
    },
    [cardsMap, removeCard, showDetailsModal],
  );

  const handleUpdateNotes = React.useCallback(
    async (id: string, notes: string) => {
      const current = cardsMap[id];
      if (!current) return;
      const updated: CardType = { ...current, notes, updatedAt: new Date().toISOString() };
      upsertCard(updated);
      await fetch(`${CARDS_API_URL}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
    },
    [cardsMap, upsertCard],
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
          normalized.forEach((card) => upsertCard(card));
          await Promise.all(
            normalized.map((entry) =>
              fetch(CARDS_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: entry.id,
                  ...toServerPayload(entry),
                  createdAt: entry.createdAt,
                }),
              }),
            ),
          );
          alert(`Successfully imported ${importedItems.length} bookmarks!`);
        } catch {
          alert("Error reading file. Please make sure it's a valid JSON file.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [upsertCard]);

  const handleClearData = React.useCallback(async () => {
    if (window.confirm("Clear all saved bookmarks? This cannot be undone.")) {
      setCards([]);
      clearSelection();
      await fetch(CARDS_API_URL, { method: "DELETE" });
      setShowDetailsModal(false);
      setFocusedCardId(null);
    }
  }, [clearSelection, setCards]);

  const handleAssignToCollection = React.useCallback(
    (cardIds: string[], collectionId: string) => {
      const collections = useCollectionsStore.getState().collections;
      const collection = collections[collectionId];
      if (!collection) return;
      const slug = collectionTagSlug(collection);
      const currentCards = useCardsStore.getState().cards;
      const changed = cardIds.filter((cardId) => {
        const card = currentCards[cardId];
        return card && (!Array.isArray(card.tags) || !card.tags.includes(slug));
      });

      if (changed.length === 0) {
        showToast({ message: `Already in "${collection.name}"`, durationMs: 2500 });
        return;
      }

      bulkAssignTag(cardIds, slug);
      showToast({
        message:
          changed.length > 1
            ? `Moved ${changed.length} cards to "${collection.name}"`
            : `Moved to "${collection.name}"`,
        actionLabel: "Undo",
        onAction: () => bulkRemoveTag(cardIds, slug),
        durationMs: 5000,
      });
    },
    [bulkAssignTag, bulkRemoveTag, showToast],
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
      const currentSelected = useCardsStore.getState().selectedIds;
      const dragIds = currentSelected.includes(cardId) ? currentSelected : [cardId];
      if (!currentSelected.includes(cardId)) {
        useCardsStore.getState().selectOnly(cardId);
      }
      setActiveDragIds(dragIds);
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
    const pendingCount = cards.filter((card) => card.state === "pending").length;
    const errorCount = cards.filter((card) => card.state === "error").length;
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

        {layoutMode === "list" ? (
          <div className="bookmark-list">
            {filtered.map((card) => (
              <Card
                key={card.id}
                id={card.id}
                title={card.title}
                domain={card.domain}
                image={settings.showThumbnails ? card.image ?? undefined : undefined}
                state={card.state}
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
                state={card.state}
                onClick={() => handleCardClick(card.id)}
                layout={layoutMode as any}
                url={card.url ?? ""}
              />
            ))}
          </div>
        )}
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

        {showDetailsModal && focusedCard ? (
          <BookmarkModal
            item={{
              id: focusedCard.id,
              title: focusedCard.title,
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
