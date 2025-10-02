export const randomId = (): string => {
  try {
    const value = globalThis.crypto?.randomUUID?.();
    if (value) return value;
  } catch {}
  return Math.random().toString(36).slice(2);
};
