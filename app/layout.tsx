import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./style.css";

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

export const viewport: Viewport = { viewportFit: "cover" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
