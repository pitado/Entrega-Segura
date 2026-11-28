import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Figtree, Sora } from "next/font/google";
import "./style.css";

// Tipografia da marca: Sora nos títulos e Figtree no texto.
const sora = Sora({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap" });
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" });

const siteUrl = "https://pitou.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Demonstração de entregas · Pitou", template: "%s · Pitou" },
  description: "Simulação de entregas para estabelecimento, entregador e cliente.",
  applicationName: "Pitou",
  openGraph: {
    type: "website",
    siteName: "Pitou",
    locale: "pt_BR",
    url: siteUrl,
    title: "Demonstração de entregas · Pitou",
    description: "Simulação de entregas para estabelecimento, entregador e cliente.",
  },
  // MVP: manter fora dos buscadores até a versão de produção.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { viewportFit: "cover", themeColor: "#080A10" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="pt-BR" className={`${sora.variable} ${figtree.variable}`}><body>{children}</body></html>;
}
