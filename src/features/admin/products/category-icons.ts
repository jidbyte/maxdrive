/** Icon keys selectable for categories (rendered by storefront/ui/category-icon.tsx). */
export const CATEGORY_ICONS = [
  "disc",
  "droplet",
  "filter",
  "battery",
  "zap",
  "gauge",
  "cog",
  "thermometer",
  "lightbulb",
  "circle-dot",
  "sparkles",
  "snowflake",
  "wrench",
] as const;

export type CategoryIconKey = (typeof CATEGORY_ICONS)[number];
