'use client';

import React from "react";

type SidebarProps = {
  active?: string;
  onChange: (id: string) => void;
};

export function Sidebar({ active = "Home", onChange }: SidebarProps) {
  const navigationItems = [
    { id: "Home", label: "Home", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { id: "All", label: "All Bookmarks", icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" },
    { id: "Work", label: "Work", icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" },
    { id: "Personal", label: "Personal", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { id: "Favorites", label: "Favorites", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
    { id: "Recent", label: "Recent", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" }
  ];

  const bottomItems = [
    { id: "settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
    { id: "help", label: "Help", icon: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }
  ];

  return (
    <nav className="sidebar-nav" aria-label="Primary">
      <div className="sidebar-nav-group">
        {navigationItems.map((item) => {
          const isActive = item.id === active;

          return (
            <button
              type="button"
              key={item.id}
              onClick={() => onChange?.(item.id)}
              className={["sidebar-nav-button", isActive ? "is-active" : ""].join(" ").trim()}
            >
              <span className="sidebar-nav-content">
                <span className={["sidebar-nav-icon", isActive ? "is-active" : ""].join(" ").trim()}>
                  <svg className="sidebar-nav-icon-symbol" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                </span>
                <span className="sidebar-nav-label">{item.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="sidebar-nav-footer">
        {bottomItems.map((item) => {
          const isActive = item.id === active;

          return (
            <button
              type="button"
              key={item.id}
              onClick={() => onChange?.(item.id)}
              className={["sidebar-nav-button", isActive ? "is-active" : ""].join(" ").trim()}
            >
              <span className="sidebar-nav-content">
                <span className={["sidebar-nav-icon", isActive ? "is-active" : ""].join(" ").trim()}>
                  <svg className="sidebar-nav-icon-symbol" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                </span>
                <span className="sidebar-nav-label">{item.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
