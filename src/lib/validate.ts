export const isValidUrl = (value: string): boolean => {
  try {
    // new URL throws on invalid URLs
    const parsed = new URL(value);
    return Boolean(parsed.protocol && parsed.host);
  } catch {
    return false;
  }
};
