import { NextResponse } from "next/server";

export const privateHeaders = { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" };
export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: privateHeaders });
export const fail = (error: string, status = 400, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status, headers: privateHeaders });
export async function readJson(req: Request): Promise<Record<string, unknown>> {
  const body = await req.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
}
export const text = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
export const digits = (v: unknown) => typeof v === "string" ? v.replace(/\D/g, "").slice(0, 15) : "";
/** Valor em reais: aceita número ou texto "12,50". Retorna null se inválido. */
export function money(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v.replace(/\./g, "").replace(",", ".")) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return null;
  return Math.round(n * 100) / 100;
}
export function httpsUrl(v: unknown): string | null {
  const s = text(v, 600);
  if (!s) return null;
  try { const u = new URL(s); return u.protocol === "https:" ? u.toString() : null; } catch { return null; }
}
export function coordinate(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  const a = typeof lat === "number" ? lat : Number(lat), b = typeof lng === "number" ? lng : Number(lng);
  if (lat === null || lat === undefined || lat === "" || lng === null || lng === undefined || lng === "") return null;
  return Number.isFinite(a) && Math.abs(a) <= 90 && Number.isFinite(b) && Math.abs(b) <= 180 ? { lat: a, lng: b } : null;
}
