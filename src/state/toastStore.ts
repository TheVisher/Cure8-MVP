'use client';

import { create } from "zustand";

export type Toast = {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  kind?: "info" | "success" | "warning" | "danger";
};

type ToastState = {
  toasts: Toast[];
  show: (toast: Omit<Toast, "id"> & { id?: string; durationMs?: number }) => string;
  dismiss: (id: string) => void;
};

const randomId = () => {
  try {
    if (typeof window !== "undefined" && window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
  } catch {}
  return `toast_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
};

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: ({ id: providedId, durationMs = 4000, ...toast }) => {
    const id = providedId ?? randomId();
    set((state) => ({ toasts: [...state.toasts.filter((t) => t.id !== id), { ...toast, id }] }));
    if (durationMs > 0) {
      setTimeout(() => {
        get().dismiss(id);
      }, durationMs);
    }
    return id;
  },
  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },
}));
