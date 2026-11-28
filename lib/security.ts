const encoder = new TextEncoder();

export function toHex(bytes: ArrayBuffer | Uint8Array) {
  return Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)).map(x => x.toString(16).padStart(2, "0")).join("");
}
export async function sha256(input: string) {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(input)));
}
export function randomToken(bytes = 32) {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)));
}
/** Comparação em tempo constante para strings de mesmo formato. */
export function safeEqual(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
export async function hashToken(token: string) { return sha256(token); }
export function validUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}
export function validAccessToken(v: unknown): v is string { return typeof v === "string" && /^[a-f0-9]{64}$/.test(v); }
/** Aceita só requisições do próprio site (comparando o host do Origin com o da URL ou o cabeçalho Host). */
export function originAllowed(req: Request) {
  const o = req.headers.get("origin");
  if (!o) return true;
  let host: string;
  try { host = new URL(o).host; } catch { return false; }
  return host === new URL(req.url).host || host === req.headers.get("host") || host === req.headers.get("x-forwarded-host");
}
