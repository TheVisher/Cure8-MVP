'use client';

import React from "react";
import { createPortal } from "react-dom";

import { useToastStore } from "@/src/state/toastStore";

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined" || toasts.length === 0) {
    return null;
  }

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[9999] flex max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="rounded-2xl border border-white/10 bg-black/70 px-4 py-3 text-sm text-white shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between gap-3">
            <span>{toast.message}</span>
            {toast.actionLabel ? (
              <button
                type="button"
                className="text-xs font-semibold text-violet-300 hover:text-violet-200"
                onClick={() => {
                  toast.onAction?.();
                  dismiss(toast.id);
                }}
              >
                {toast.actionLabel}
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>,
    document.body,
  );
}
