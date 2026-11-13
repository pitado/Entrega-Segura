import { db } from "./db";

export const statuses = ["preparing", "on_route", "arrived", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof statuses)[number];
export const isUUID = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export const isStatus = (v: unknown): v is OrderStatus => statuses.includes(v as OrderStatus);
export const isCoordinate = (v: unknown, limit: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= limit;

export function operatorAuthorized(request: Request): boolean {
  const secret = process.env.OPERATOR_KEY;
  const received = request.headers.get("authorization");
  return Boolean(secret && received && received === `Bearer ${secret}`);
}
export const noStore = { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" };
export async function recordEvent(orderId: string, eventType: string) {
  const sql = db();
  await sql`INSERT INTO public.order_events (order_id, event_type) VALUES (${orderId}::uuid, ${eventType})`;
}
