'use client';

import React from "react";

import OmniBar from "@/src/components/OmniBar";

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
                <OmniBar onSearch={onSearch} onAddUrl={onAddUrl} />
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
