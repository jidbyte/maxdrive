/** "Oils & Fluids" → "oils-and-fluids"; "Mercedes-Benz" → "mercedes-benz". */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Appends a short random suffix — for product slugs that must stay unique. */
export function uniqueSlug(value: string): string {
  const suffix = crypto.randomUUID().slice(0, 6);
  const base = slugify(value) || "item";
  return `${base}-${suffix}`;
}
