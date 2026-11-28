import type { Metadata } from "next";
import AuthForm from "./AuthForm";
import "../app.css";

export const metadata: Metadata = {
  title: { absolute: "Entrar · Pitou" },
  description: "Acesse o painel do seu estabelecimento no Pitou ou crie a sua conta.",
  alternates: { canonical: "/entrar" },
  // Tela de login não precisa aparecer na busca, mas os links dela podem ser seguidos.
  robots: { index: false, follow: true },
};

export default async function EntrarPage({ searchParams }: { searchParams: Promise<{ criar?: string }> }) {
  const params = await searchParams;
  return <AuthForm initialMode={params.criar !== undefined ? "signup" : "login"} />;
}
