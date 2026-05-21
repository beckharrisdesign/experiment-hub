/**
 * Convert a string to a URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces, underscores, and multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Get slug from experiment name
 */
export function getExperimentSlug(name: string): string {
  return slugify(name);
}

/**
 * Canonical href slug for /experiments/[slug] — prefers id when it differs from name slug.
 */
export function getExperimentHrefSlug(experiment: {
  id: string;
  name: string;
}): string {
  const nameSlug = slugify(experiment.name);
  return nameSlug === experiment.id ? nameSlug : experiment.id;
}

