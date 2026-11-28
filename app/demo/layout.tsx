import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: { absolute: "Demonstração de entregas · Pitou" },
  description: "Veja o Pitou funcionando: simulação de uma entrega nas telas do estabelecimento, do entregador e do cliente, com mapa em tempo real e código de entrega.",
  alternates: { canonical: "/demo" },
};

export default function DemoLayout({ children }: { children: ReactNode }) {
  return children;
}
