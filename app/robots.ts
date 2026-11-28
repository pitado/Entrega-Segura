import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/seo";

// Áreas privadas (painel, links de entrega e API) ficam fora dos buscadores.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/painel", "/acompanhar/", "/entregador/"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
