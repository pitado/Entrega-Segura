"use client";

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}

/** fetch com JSON e mensagens de erro em português. */
export async function api<T = Record<string, unknown>>(url: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: options.method || (options.body ? "POST" : "GET"),
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch { throw new ApiError("Sem conexão. Verifique a internet.", 0); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(String(data.error || "Algo deu errado. Tente novamente."), res.status, data.code);
  return data as T;
}

const brlFormat = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const brl = (v: number | null | undefined) => brlFormat.format(Number(v) || 0);
export const time = (v: string | null | undefined) => v ? new Date(v).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : "";
export const dateTime = (v: string | null | undefined) => v ? new Date(v).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : "";
export function phone(v: string | null | undefined) {
  const d = (v || "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v || "";
}
export const whatsappUrl = (phoneDigits: string, text: string) => {
  const d = phoneDigits.replace(/\D/g, "");
  return `https://wa.me/${d.length <= 11 ? "55" + d : d}?text=${encodeURIComponent(text)}`;
};
export const statusLabel: Record<string, string> = {
  preparing: "Em preparo",
  on_route: "Em rota",
  arrived: "No destino",
  delivered: "Entregue",
  cancelled: "Cancelado",
  customer_ready: "Cliente pronto para receber",
  destination_confirmed: "Cliente confirmou a localização",
  code_verified: "Código de entrega confirmado",
  code_failed: "Código de entrega incorreto",
};
export const actorLabel: Record<string, string> = { establishment: "estabelecimento", courier: "entregador", customer: "cliente" };
export function mapsLinks(point: { lat: number; lng: number } | null, address: string) {
  const q = point ? `${point.lat},${point.lng}` : address;
  const waze = new URL("https://waze.com/ul");
  if (point) waze.searchParams.set("ll", q); else waze.searchParams.set("q", address);
  waze.searchParams.set("navigate", "yes");
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}&travelmode=driving`,
    waze: waze.toString(),
  };
}
export const toPoint = (lat: unknown, lng: unknown) =>
  lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) ? { lat: Number(lat), lng: Number(lng) } : null;
