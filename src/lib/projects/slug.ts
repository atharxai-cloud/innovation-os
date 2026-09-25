export function slugifyProjectTitle(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const ascii = normalized
    .replace(/[\u0600-\u06ff]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return ascii || "innovation";
}
