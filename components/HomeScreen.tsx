'use client';

import React from "react";
import { Card } from "./Card";

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

type HomeScreenProps = {
  totalItems: number;
  readyItems: number;
  pendingItems: number;
  errorItems: number;
  recentItems: BookmarkItem[];
  onQuickAdd: () => void;
  onImport: () => void;
  onOpenSettings: () => void;
  onGoToLibrary: () => void;
  onSelectBookmark: (item: BookmarkItem) => void;
  showThumbnails: boolean;
};

export default function HomeScreen({
  totalItems,
  readyItems,
  pendingItems,
  errorItems,
  recentItems,
  onQuickAdd,
  onImport,
  onOpenSettings,
  onGoToLibrary,
  onSelectBookmark,
  showThumbnails
}: HomeScreenProps) {
  const hasBookmarks = totalItems > 0;

  const quickActions = [
    {
      id: "quick-add",
      label: "New Capture",
      description: "Paste a link to save instantly",
      cta: "Paste link",
      onClick: onQuickAdd
    },
    {
      id: "quick-import",
      label: "Import Library",
      description: "Bring in bookmarks from a JSON export",
      cta: "Import file",
      onClick: onImport
    },
    {
      id: "quick-settings",
      label: "Tune Experience",
      description: "Adjust previews, thumbnails, and storage",
      cta: "Open settings",
      onClick: onOpenSettings
    }
  ];

  return (
    <div className="space-y-8">
      <section className="home-hero">
        <div className="home-hero-content">
          <p className="home-eyebrow">Welcome back to Cure8</p>
          <h1 className="home-title">Curate what matters most today.</h1>
          <p className="home-subtitle">
            Save fresh inspiration, surface trusted resources, and keep your web finds within reach.
            Launch your day with quick captures, confident context, and a single hub for the links that matter.
          </p>
          <div className="home-actions">
            <button type="button" className="home-action primary" onClick={onQuickAdd}>
              Paste a link
            </button>
            <button type="button" className="home-action" onClick={onGoToLibrary}>
              Browse library
            </button>
          </div>
        </div>
        <div className="home-hero-card">
          <span className="home-hero-label">Today&apos;s snapshot</span>
          <div className="home-hero-metric">
            <strong>{totalItems}</strong>
            <span>items saved</span>
          </div>
          <div className="home-hero-stats">
            <span><span className="dot dot-ready" aria-hidden="true"></span>{readyItems} ready</span>
            <span><span className="dot dot-pending" aria-hidden="true"></span>{pendingItems} fetching</span>
            <span><span className="dot dot-error" aria-hidden="true"></span>{errorItems} need attention</span>
          </div>
          <button type="button" onClick={onGoToLibrary} className="home-hero-link">
            Open library ↗
          </button>
        </div>
      </section>

      <section className="home-quick-actions">
        {quickActions.map(action => (
          <ActionCard key={action.id} {...action} />
        ))}
      </section>

      <section>
        <h2 className="home-section-title">Your library snapshot</h2>
        <div className="home-stats-grid">
          <StatCard label="Ready to browse" value={readyItems} tone="success" />
          <StatCard label="Fetching previews" value={pendingItems} tone="neutral" />
          <StatCard label="Needs review" value={errorItems} tone="alert" />
        </div>
      </section>

      {hasBookmarks ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="home-section-title">Latest captures</h2>
            <button type="button" className="home-ghost-link" onClick={onGoToLibrary}>
              View all ↗
            </button>
          </div>
          <div className="home-recent-grid">
            {recentItems.map(item => (
              <div key={item.id} className="home-recent-card">
                <Card
                  title={item.title}
                  domain={item.domain}
                  image={showThumbnails ? item.image || undefined : undefined}
                  state={item.state}
                  onClick={() => onSelectBookmark(item)}
                  url={item.url}
                />
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="home-empty">
          <div className="home-empty-card">
            <h3>No bookmarks yet</h3>
            <p>Paste a URL or import an export file to start building your curated library.</p>
            <div className="home-empty-actions">
              <button type="button" className="home-action primary" onClick={onQuickAdd}>
                Add your first link
              </button>
              <button type="button" className="home-action" onClick={onImport}>
                Import from file
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ value, label, tone = "neutral" }: { value: number; label: string; tone?: "success" | "neutral" | "alert" }) {
  return (
    <div className={`home-stat-card tone-${tone}`}>
      <span className="home-stat-value">{value}</span>
      <span className="home-stat-label">{label}</span>
    </div>
  );
}

function ActionCard({ label, description, cta, onClick }: { label: string; description: string; cta: string; onClick: () => void }) {
  return (
    <button type="button" className="home-action-card" onClick={onClick}>
      <div className="home-action-card-body">
        <span className="home-action-card-label">{label}</span>
        <span className="home-action-card-description">{description}</span>
      </div>
      <span className="home-action-card-cta">{cta}</span>
    </button>
  );
}
