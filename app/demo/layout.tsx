import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: { absolute: "Demonstração de entregas · Pitou" },
  description: "Simulação do Pitou para estabelecimento, entregador e cliente.",
};

export default function DemoLayout({ children }: { children: ReactNode }) {
  return children;
}
