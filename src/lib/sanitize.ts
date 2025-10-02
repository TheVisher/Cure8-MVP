// Simple server-side HTML sanitizer
export const sanitizeHtml = (input: string | null | undefined): string => {
  if (!input || typeof input !== "string") return "";

  // Strip all HTML tags for server-side safety
  const stripped = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();

  return stripped;
};
