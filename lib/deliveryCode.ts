import { sha256, safeEqual } from "./security";
import type { Point } from "./geo";

export { distanceMeters } from "./geo";

/**
 * Código de entrega ("Encontro"): 4 dígitos que só o cliente vê e que o entregador digita para concluir.
 * O código é derivado do link do cliente com um segredo do servidor, então não precisa de coluna nova no banco
 * e o entregador não consegue calculá-lo (ele nunca recebe o link do cliente).
 * DELIVERY_CODE_SECRET é opcional; sem ela, o segredo vem de DATABASE_URL, que existe só no servidor.
 */
export const MAX_CODE_ATTEMPTS = 5;
/** O cliente vê o código quando o entregador marca a chegada ou está a até esta distância do destino. */
export const RELEASE_METERS = 300;

export async function deliveryCode(trackingToken: string): Promise<string> {
  const secret = process.env.DELIVERY_CODE_SECRET || process.env.DATABASE_URL || "";
  const hex = await sha256(`pitou-codigo-entrega:${secret}:${String(trackingToken).toLowerCase()}`);
  return String(parseInt(hex.slice(0, 12), 16) % 10000).padStart(4, "0");
}

export async function codeMatches(trackingToken: string, typed: unknown): Promise<boolean> {
  const value = typeof typed === "string" ? typed.replace(/\D/g, "") : "";
  if (value.length !== 4) return false;
  return safeEqual(value, await deliveryCode(trackingToken));
}

export function point(lat: unknown, lng: unknown): Point | null {
  const a = lat == null ? NaN : Number(lat), b = lng == null ? NaN : Number(lng);
  return Number.isFinite(a) && Number.isFinite(b) ? { lat: a, lng: b } : null;
}
