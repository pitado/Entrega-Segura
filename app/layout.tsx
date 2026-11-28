import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Figtree, Sora } from "next/font/google";
import "./style.css";
import { ogImage, siteDescription, siteName, siteTitle, siteUrl } from "../lib/seo";

// Tipografia da marca: Sora nos títulos e Figtree no texto.
const sora = Sora({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap" });
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: siteTitle, template: "%s · Pitou" },
  description: siteDescription,
  applicationName: siteName,
  openGraph: {
    type: "website",
    siteName,
    locale: "pt_BR",
    url: siteUrl,
    title: siteTitle,
    description: siteDescription,
    images: [ogImage],
  },
  twitter: { card: "summary_large_image", title: siteTitle, description: siteDescription, images: [ogImage.url] },
  // Páginas públicas ficam visíveis aos buscadores; painel, login e links de entrega marcam noindex nas próprias páginas.
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { viewportFit: "cover", themeColor: "#080A10" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="pt-BR" className={`${sora.variable} ${figtree.variable}`}><body>{children}</body></html>;
}
