'use client';

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Card } from "@/components/Card";
import { AppShell } from "@/components/AppShell";
import { BookmarkModal } from "@/components/BookmarkModal";
import HomeScreen from "@/components/HomeScreen";
import SettingsScreen from "@/components/SettingsScreen";

const STORAGE_KEY = "cure8.bookmarks";
const SETTINGS_KEY = "cure8.settings";
const LAYOUT_KEY = "cure8.layout";

const defaultSettings = {
  autoFetchMetadata: true,
  showThumbnails: true,
  previewServiceUrl: "http://localhost:8787/preview?url={{url}}"
};

const LAYOUT_OPTIONS = [
  { id: "grid", label: "Grid" },
  { id: "masonry", label: "Masonry" },
  { id: "list", label: "List" },
  { id: "compact", label: "Compact" }
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
  state: "ok" | "pending" | "error";
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

function normalizeServerCard(card: any): BookmarkItem {
  const createdAt = card.createdAt
    ? typeof card.createdAt === "number"
      ? card.createdAt
      : new Date(card.createdAt).getTime()
    : Date.now();

  return {
    id: card.id,
    title: card.title || card.url || "Untitled",
    url: card.url || "",
    domain: card.domain || safeHost(card.url),
    image: card.image || null,
    description: card.description || "",
    notes: card.notes || "",
    state: card.status || "ok",
    createdAt,
  };
}

function toServerPayload(item: BookmarkItem) {
  return {
    title: item.title,
    url: item.url,
    image: item.image ?? null,
    notes: item.notes ?? "",
    description: item.description ?? "",
    domain: item.domain ?? safeHost(item.url),
    status: item.state ?? "ok",
    metadata: null,
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

function MainContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeView, setActiveView] = React.useState(() => {
    const param = searchParams?.get("view");
    return param && typeof param === "string" ? param : "Home";
  });

  const [q, setQ] = React.useState(() => searchParams?.get("q") || "");
  const [items, setItems] = React.useState<BookmarkItem[]>([]);
  const [showDetailsModal, setShowDetailsModal] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<BookmarkItem | null>(null);
  const [settings, setSettings] = React.useState(defaultSettings);
  const [layoutMode, setLayoutMode] = React.useState(() => {
    const urlLayout = searchParams?.get("layout");
    if (urlLayout && LAYOUT_OPTIONS.some(option => option.id === urlLayout)) {
      return urlLayout;
    }
    return "grid";
  });

  // Load settings and layout from localStorage
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // Load settings
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setSettings({ ...defaultSettings, ...parsed });
        }
      }
    } catch {}

    // Load layout (only if not set via URL)
    const urlLayout = searchParams?.get("layout");
    if (!urlLayout) {
      try {
        const stored = window.localStorage.getItem(LAYOUT_KEY);
        if (stored && LAYOUT_OPTIONS.some(option => option.id === stored)) {
          setLayoutMode(stored);
        }
      } catch {}
    }
  }, []);

  // Save settings
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  // Save layout
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LAYOUT_KEY, layoutMode);
    } catch {}
  }, [layoutMode]);

  // Load data
  React.useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      let serverItems: BookmarkItem[] = [];

      try {
        const response = await fetch(CARDS_API_URL, { cache: "no-store" });
        if (!response.ok) throw new Error(`Failed with ${response.status}`);
        const data = await response.json();
        if (Array.isArray(data)) {
          serverItems = data.map(normalizeServerCard);
        }
      } catch (error) {
        console.error("Failed to load bookmarks from API", error);
      }

      if (cancelled) return;
      setItems(serverItems);
    };

    bootstrap();
    return () => { cancelled = true; };
  }, []);

  const handleViewChange = React.useCallback((view: string) => {
    const newUrl = view === "Home" ? "/" : `/?view=${view}`;
    router.push(newUrl, { scroll: false });
    setActiveView(view);
  }, [router]);

  const handleLayoutChange = React.useCallback((mode: string) => {
    setLayoutMode(mode);
  }, []);

  const handleSearch = React.useCallback((query: string) => {
    setQ(query);
  }, []);

  const handleAddUrl = React.useCallback(async (url: string) => {
    const id = randomId();
    let domain = url;
    try {
      domain = new URL(url).hostname.replace(/^www\./, "");
    } catch {}

    const createdAt = Date.now();
    const newItem: BookmarkItem = {
      id,
      title: url,
      domain,
      url,
      description: '',
      notes: '',
      state: settings.autoFetchMetadata ? "pending" : "ok",
      image: null,
      createdAt,
    };

    setItems((x) => [newItem, ...x]);

    await fetch(CARDS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        ...toServerPayload(newItem),
        createdAt: new Date(createdAt).toISOString(),
      }),
    });

    if (!settings.autoFetchMetadata) return;

    try {
      const requestUrl = buildPreviewRequestUrl(settings.previewServiceUrl, url);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const res = await fetch(requestUrl, {
        signal: controller.signal,
        mode: 'cors'
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`Preview service responded with ${res.status}`);
      const meta = await res.json();

      const updatedItem = {
        ...newItem,
        title: meta.title || newItem.title,
        domain: meta.domain || newItem.domain,
        image: meta.cardImage || meta.heroImage || null,
        url: meta.url || newItem.url || url,
        description: meta.description || newItem.description || '',
        state: "ok" as const,
      };

      setItems((x) => x.map((it) => (it.id === id ? updatedItem : it)));

      await fetch(`${CARDS_API_URL}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...toServerPayload(updatedItem),
          status: "ok",
        }),
      });
    } catch (error) {
      console.warn("Preview service unavailable, bookmark saved without metadata:", error instanceof Error ? error.message : error);
      // Mark as OK since the bookmark is saved, just without metadata
      setItems((x) => x.map((it) => (it.id === id ? { ...it, state: "ok" as const } : it)));
      await fetch(`${CARDS_API_URL}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ok" }),
      });
    }
  }, [settings]);

  const handleCardClick = (item: BookmarkItem) => {
    setSelectedItem(item);
    setShowDetailsModal(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    const item = items.find(it => it.id === itemId);
    if (item && window.confirm(`Are you sure you want to delete "${item.title}"?`)) {
      setItems(prev => prev.filter(it => it.id !== itemId));
      await fetch(`${CARDS_API_URL}/${itemId}`, { method: "DELETE" });
      setShowDetailsModal(false);
      setSelectedItem(null);
    }
  };

  const handleUpdateNotes = async (id: string, notes: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, notes } : it));
    await fetch(`${CARDS_API_URL}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
  };

  const handleExport = React.useCallback(() => {
    const dataStr = JSON.stringify(items, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cure8-bookmarks-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [items]);

  const handleImport = React.useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (evt: any) => {
        try {
          const importedItems = JSON.parse(evt.target.result);
          if (Array.isArray(importedItems)) {
            const baseTime = Date.now();
            const normalized = importedItems.map((item, index) => normalizeServerCard({ ...item, createdAt: baseTime - index }));
            setItems(prev => [...normalized, ...prev]);

            await Promise.all(
              normalized.map(entry =>
                fetch(CARDS_API_URL, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: entry.id,
                    ...toServerPayload(entry),
                    createdAt: new Date(entry.createdAt).toISOString(),
                  }),
                })
              )
            );
            alert(`Successfully imported ${importedItems.length} bookmarks!`);
          } else {
            alert("Invalid file format. Please select a valid Cure8 export file.");
          }
        } catch {
          alert("Error reading file. Please make sure it's a valid JSON file.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const handleClearData = async () => {
    if (window.confirm("Clear all saved bookmarks? This cannot be undone.")) {
      setItems([]);
      await fetch(CARDS_API_URL, { method: "DELETE" });
      setShowDetailsModal(false);
      setSelectedItem(null);
    }
  };

  const focusOmnibox = React.useCallback(() => {
    if (typeof document === "undefined") return;
    const input = document.querySelector('input[placeholder*="Paste a URL"]') as HTMLInputElement;
    if (input) {
      input.focus();
      input.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const sortedByRecency = React.useMemo(() => {
    return [...items].sort((a, b) => {
      const aTime = typeof a.createdAt === "number" ? a.createdAt : 0;
      const bTime = typeof b.createdAt === "number" ? b.createdAt : 0;
      return bTime - aTime;
    });
  }, [items]);

  const filtered = React.useMemo(() => {
    const search = q.toLowerCase();
    const matchesSearch = (item: BookmarkItem) => {
      const title = (item.title || "").toLowerCase();
      const domain = (item.domain || "").toLowerCase();
      return !search || title.includes(search) || domain.includes(search);
    };

    if (activeView === "Recent") {
      return sortedByRecency
        .filter(matchesSearch)
        .filter(it => typeof it.createdAt === "number")
        .slice(0, 50);
    }

    return sortedByRecency.filter(matchesSearch);
  }, [sortedByRecency, q, activeView]);

  let content;
  if (activeView === "settings") {
    content = (
      <SettingsScreen
        settings={settings}
        defaultSettings={defaultSettings}
        onUpdateSettings={(partial) => setSettings(prev => ({ ...prev, ...partial }))}
        onResetSettings={() => setSettings({ ...defaultSettings })}
        onExport={handleExport}
        onImport={handleImport}
        onClearData={handleClearData}
        itemCount={items.length}
      />
    );
  } else if (activeView === "Home") {
    const pendingCount = items.filter(it => it.state === "pending").length;
    const errorCount = items.filter(it => it.state === "error").length;
    const okCount = items.length - pendingCount - errorCount;
    const recentItems = sortedByRecency.slice(0, 6);

    content = (
      <HomeScreen
        totalItems={items.length}
        readyItems={okCount}
        pendingItems={pendingCount}
        errorItems={errorCount}
        recentItems={recentItems}
        onQuickAdd={focusOmnibox}
        onImport={handleImport}
        onOpenSettings={() => handleViewChange("settings")}
        onGoToLibrary={() => handleViewChange("All")}
        onSelectBookmark={handleCardClick}
        showThumbnails={settings.showThumbnails}
      />
    );
  } else if (activeView === "help") {
    content = (
      <div className="bg-surface border border-white/10 rounded-card p-6 text-text-secondary">
        <h2 className="text-xl font-bold text-text-primary mb-3">Help</h2>
        <p className="text-sm">
          We&apos;re working on curated tips and documentation. For now, reach out to support@cure8.com
          if you need a hand.
        </p>
      </div>
    );
  } else {
    content = (
      <>
        <div className="layout-toolbar">
          <span className="layout-label">Layout</span>
          <div className="layout-toggle">
            {LAYOUT_OPTIONS.map(option => (
              <button
                key={option.id}
                type="button"
                className={[
                  "layout-toggle-btn",
                  layoutMode === option.id ? "is-active" : ""
                ].join(" ")}
                onClick={() => handleLayoutChange(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {layoutMode === "list" ? (
          <div className="bookmark-list">
            {filtered.map(it => (
              <Card
                key={it.id}
                title={it.title}
                domain={it.domain}
                image={settings.showThumbnails ? it.image || undefined : undefined}
                state={it.state}
                onClick={() => handleCardClick(it)}
                layout={layoutMode as any}
                url={it.url}
              />
            ))}
          </div>
        ) : (
          <div className={["bookmark-grid", layoutMode === "masonry" ? "masonry" : "", layoutMode === "compact" ? "compact" : ""].filter(Boolean).join(" ")}>
            {filtered.map(it => (
              <Card
                key={it.id}
                title={it.title}
                domain={it.domain}
                image={settings.showThumbnails ? it.image || undefined : undefined}
                state={it.state}
                onClick={() => handleCardClick(it)}
                layout={layoutMode as any}
                url={it.url}
              />
            ))}
          </div>
        )}

        {showDetailsModal && selectedItem && (
          <BookmarkModal
            item={selectedItem}
            onClose={() => setShowDetailsModal(false)}
            onDelete={() => handleDeleteItem(selectedItem.id)}
            onUpdateNotes={handleUpdateNotes}
          />
        )}
      </>
    );
  }

  return (
    <AppShell sidebar={<Sidebar active={activeView} onChange={handleViewChange} />} onSearch={handleSearch} onAddUrl={handleAddUrl}>
      {content}
    </AppShell>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="p-8 text-white">Loading...</div>}>
      <MainContent />
    </Suspense>
  );
}
