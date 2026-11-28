import type { Metadata } from "next";
import Panel from "./Panel";
import "../app.css";

export const metadata: Metadata = {
  title: { absolute: "Painel · Pitou" },
  description: "Painel do estabelecimento no Pitou.",
  robots: { index: false, follow: false },
};

export default function PainelPage() {
  return <Panel />;
}
