'use client';

import React from "react";

type Settings = {
  autoFetchMetadata: boolean;
  showThumbnails: boolean;
  previewServiceUrl: string;
};

type SettingsScreenProps = {
  settings: Settings;
  defaultSettings: Settings;
  onUpdateSettings: (partial: Partial<Settings>) => void;
  onResetSettings: () => void;
  onExport: () => void;
  onImport: () => void;
  onClearData: () => void;
  itemCount: number;
};

export default function SettingsScreen({
  settings,
  defaultSettings,
  onUpdateSettings,
  onResetSettings,
  onExport,
  onImport,
  onClearData,
  itemCount
}: SettingsScreenProps) {
  const [previewEndpoint, setPreviewEndpoint] = React.useState(
    settings.previewServiceUrl || defaultSettings.previewServiceUrl
  );

  React.useEffect(() => {
    setPreviewEndpoint(settings.previewServiceUrl || defaultSettings.previewServiceUrl);
  }, [settings.previewServiceUrl, defaultSettings.previewServiceUrl]);

  const applyPreviewEndpoint = () => {
    const trimmed = previewEndpoint.trim();
    onUpdateSettings({ previewServiceUrl: trimmed || defaultSettings.previewServiceUrl });
  };

  const handlePreviewKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyPreviewEndpoint();
      event.currentTarget.blur();
    }
  };

  return (
    <div className="space-y-6">
      <section className="settings-card">
        <div className="settings-card-header">
          <div>
            <h2 className="settings-card-title">Preferences</h2>
            <p className="settings-card-subtitle">
              Tailor Cure8 to match how you gather and review links.
            </p>
          </div>
          <button type="button" className="settings-ghost-btn" onClick={onResetSettings}>
            Reset to defaults
          </button>
        </div>

        <div className="settings-toggle-list">
          <SettingsToggle
            label="Auto-fetch metadata"
            description="Enrich newly added URLs with titles, domains, and preview art using the link preview service."
            checked={settings.autoFetchMetadata}
            onChange={(value) => onUpdateSettings({ autoFetchMetadata: value })}
          />

          <SettingsToggle
            label="Show thumbnails"
            description="Display preview images on cards when a thumbnail is available. Turn off for a text-first layout."
            checked={settings.showThumbnails}
            onChange={(value) => onUpdateSettings({ showThumbnails: value })}
          />
        </div>
      </section>

      <section className="settings-card">
        <h2 className="settings-card-title">Link Preview Service</h2>
        <p className="settings-card-subtitle">
          Point Cure8 at your metadata service. Use <code className="settings-code">{"{{url}}"}</code>
          as a placeholder for the collected URL.
        </p>

        <div className="settings-field-group">
          <label className="settings-label" htmlFor="preview-endpoint">
            Endpoint template
          </label>
          <input
            id="preview-endpoint"
            type="text"
            value={previewEndpoint}
            onChange={(event) => setPreviewEndpoint(event.target.value)}
            onBlur={applyPreviewEndpoint}
            onKeyDown={handlePreviewKeyDown}
            className="settings-input"
            placeholder="https://your-service.dev/preview?url={{url}}"
          />
          <p className="settings-hint">
            Example: <span className="settings-hint-strong">{"http://localhost:8787/preview?url={{url}}"}</span>
          </p>
        </div>
      </section>

      <section className="settings-card">
        <h2 className="settings-card-title">Library</h2>
        <p className="settings-card-subtitle">
          You currently have <span className="settings-stat">{itemCount}</span> saved bookmark{itemCount === 1 ? "" : "s"}.
        </p>

        <div className="settings-actions">
          <button type="button" onClick={onExport} className="settings-pill-btn">
            Export bookmarks
          </button>
          <button type="button" onClick={onImport} className="settings-pill-btn settings-pill-btn--ghost">
            Import bookmarks
          </button>
        </div>

        <div className="settings-danger">
          <div>
            <h3 className="settings-danger-title">Danger zone</h3>
            <p className="settings-danger-copy">
              Permanently delete every saved bookmark from this device.
            </p>
          </div>
          <button type="button" onClick={onClearData} className="settings-danger-btn">
            Clear all bookmarks
          </button>
        </div>
      </section>
    </div>
  );
}

function SettingsToggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="settings-toggle">
      <span>
        <span className="settings-toggle-label">{label}</span>
        {description && <span className="settings-toggle-description">{description}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="settings-toggle-input"
        style={{ accentColor: "#7C3AED" }}
      />
    </label>
  );
}
