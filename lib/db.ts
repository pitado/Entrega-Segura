import { neon, neonConfig } from "@neondatabase/serverless";

// Desenvolvimento local: NEON_LOCAL_ENDPOINT aponta para um servidor compatível com o protocolo HTTP do Neon.
// Em produção a variável não existe e o driver fala direto com o Neon.
if (process.env.NEON_LOCAL_ENDPOINT) neonConfig.fetchEndpoint = process.env.NEON_LOCAL_ENDPOINT;

export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada");
  return neon(url);
}
