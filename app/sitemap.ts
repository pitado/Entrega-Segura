import type { MetadataRoute } from "next";
import { db } from "../lib/db";
import { accessFor, billingColumns } from "../lib/billing";
import { validSlug } from "../lib/slug";
import { siteUrl } from "../lib/seo";

// Gerado a cada pedido para incluir os cardápios públicos que estão no ar.
export const dynamic = "force-dynamic";

async function menuEntries(): Promise<MetadataRoute.Sitemap> {
  if (!process.env.DATABASE_URL) return [];
  const rows = await db().query(
    `SELECT e.slug,${billingColumns},
       (SELECT u.email FROM establishment_users u WHERE u.establishment_id=e.id AND u.role='owner' ORDER BY u.created_at LIMIT 1) AS owner_email
     FROM establishments e WHERE e.menu_enabled=true AND e.slug IS NOT NULL LIMIT 5000`);
  // Mesma regra da página /m/[slug]: só entra o cardápio de quem está com acesso ativo.
  return rows
    .filter(row => validSlug(row.slug) && accessFor(row as never, String(row.owner_email || "")).active)
    .map(row => ({
      url: `${siteUrl}/m/${row.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const menus = await menuEntries().catch(() => []);
  return [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/demo`, changeFrequency: "monthly", priority: 0.7 },
    ...menus,
  ];
}
