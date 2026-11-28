export function slugify(name: string) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "restaurante";
}
export const validSlug = (s: unknown): s is string => typeof s === "string" && /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(s);
