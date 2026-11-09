import "./style.css";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Entrega Segura", description: "Gestão inteligente de entregas" };
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="pt-BR"><body>{children}</body></html>}