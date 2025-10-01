'use client';

import React from "react";

type OmniBoxProps = {
  onSearch: (q: string) => void;
  onAddUrl: (url: string) => void;
};

function OmniBox({ onSearch, onAddUrl }: OmniBoxProps) {
  const [q, setQ] = React.useState("");

  const isUrl = React.useMemo(() => {
    try {
      const u = new URL(q.trim());
      return /^https?:/.test(u.protocol);
    } catch {
      return /^https?:\/\//i.test(q.trim());
    }
  }, [q]);

  React.useEffect(() => {
    if (!isUrl) {
      const t = setTimeout(() => onSearch(q), 200);
      return () => clearTimeout(t);
    }
  }, [q, isUrl, onSearch]);

  const submit = () => {
    if (isUrl) {
      onAddUrl(q.trim());
      setQ("");
    } else {
      onSearch(q);
    }
  };

  return (
    <div className="omni-root">
      <div className="omni-container">
        <input
          className="omni-input"
          placeholder="Paste a URL to add, or type to search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") setQ("");
          }}
        />
        <div className="omni-hint">{isUrl ? "Add link ↵" : "Search ↵"}</div>
      </div>
      <div className="omni-glow" aria-hidden="true" />
    </div>
  );
}

type AppShellProps = {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  onSearch: (q: string) => void;
  onAddUrl: (url: string) => void;
};

export function AppShell({ sidebar, children, onSearch, onAddUrl }: AppShellProps) {
  return (
    <div className="app-shell">
      <div className="app-frame">
        <aside className="app-sidebar">
          <div className="app-sidebar-inner">
            <div className="app-logo">Cure8</div>
            {sidebar}
          </div>
        </aside>

        <section className="app-content">
          <header className="app-header">
            <div className="app-header-inner">
              <div className="omni-shadow app-header-search">
                <OmniBox onSearch={onSearch} onAddUrl={onAddUrl} />
              </div>
              <div className="app-header-meta">
                <span className="app-header-user">Jordan Winters</span>
                <span className="app-header-badge">Local Mode</span>
              </div>
            </div>
          </header>

          <main className="app-main">
            <div className="app-main-surface">
              <div className="app-main-scroll">{children}</div>
            </div>
          </main>
        </section>
      </div>
    </div>
  );
}
