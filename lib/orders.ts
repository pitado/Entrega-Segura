import { db } from "./db";

export const activeStatuses = ["preparing", "on_route", "arrived"] as const;
export type Status = "preparing" | "on_route" | "arrived" | "delivered" | "cancelled";
export type Actor = "establishment" | "courier";

const transitions: Record<Actor, Record<string, Status[]>> = {
  establishment: { preparing: ["on_route", "cancelled"], on_route: ["arrived", "delivered", "cancelled"], arrived: ["delivered", "cancelled"] },
  courier: { preparing: ["on_route"], on_route: ["arrived", "delivered"], arrived: ["delivered"] },
};

export type StatusResult = { ok: true; cashbackEarned: number } | { ok: false; error: string; status: number };

/**
 * Muda o status de um pedido. A entrega concluída credita o cashback do cliente e o cancelamento
 * devolve o saldo usado, tudo na mesma instrução SQL para não deixar o saldo pela metade.
 */
export async function changeStatus(orderId: string, next: Status, actor: Actor, scope: { establishmentId: string } | { courierId: string }): Promise<StatusResult> {
  const sql = db();
  const scopeColumn = "establishmentId" in scope ? "establishment_id" : "courier_id";
  const scopeValue = "establishmentId" in scope ? scope.establishmentId : scope.courierId;
  const rows = await sql.query(
    `SELECT status,courier_id FROM orders WHERE id=$1 AND ${scopeColumn}=$2 AND demo_session_id IS NULL LIMIT 1`, [orderId, scopeValue]);
  if (!rows.length) return { ok: false, error: "Pedido não encontrado", status: 404 };
  const previous = String(rows[0].status);
  if (!(transitions[actor][previous] || []).includes(next)) return { ok: false, error: "Mudança de status não permitida", status: 409 };
  if (next === "on_route" && !rows[0].courier_id) return { ok: false, error: "Atribua um entregador antes de iniciar a entrega", status: 409 };

  let changed: Record<string, unknown>[];
  if (next === "delivered") {
    changed = await sql.query(
      `WITH o AS (
         UPDATE orders SET status='delivered',delivered_at=now(),updated_at=now(),
           cashback_earned=CASE WHEN orders.customer_id IS NOT NULL AND orders.total_amount IS NOT NULL AND e.cashback_percent>0
             AND orders.total_amount>=e.cashback_min_order
             THEN round(greatest(orders.total_amount-orders.cashback_used,0)*e.cashback_percent/100,2) ELSE 0 END
         FROM establishments e
         WHERE e.id=orders.establishment_id AND orders.id=$1 AND orders.${scopeColumn}=$2 AND orders.status=$3
         RETURNING orders.id,orders.establishment_id,orders.customer_id,orders.cashback_earned),
       entry AS (
         INSERT INTO cashback_entries(establishment_id,customer_id,order_id,amount,kind)
         SELECT establishment_id,customer_id,id,cashback_earned,'earn' FROM o WHERE cashback_earned>0
         ON CONFLICT DO NOTHING RETURNING customer_id,amount),
       balance AS (
         UPDATE customers SET cashback_balance=cashback_balance+entry.amount,updated_at=now()
         FROM entry WHERE customers.id=entry.customer_id RETURNING customers.id)
       SELECT id,cashback_earned FROM o`, [orderId, scopeValue, previous]);
  } else if (next === "cancelled") {
    changed = await sql.query(
      `WITH o AS (
         UPDATE orders SET status='cancelled',cancelled_at=now(),updated_at=now()
         WHERE id=$1 AND ${scopeColumn}=$2 AND status=$3
         RETURNING id,establishment_id,customer_id,cashback_used),
       entry AS (
         INSERT INTO cashback_entries(establishment_id,customer_id,order_id,amount,kind)
         SELECT establishment_id,customer_id,id,cashback_used,'refund' FROM o WHERE cashback_used>0 AND customer_id IS NOT NULL
         ON CONFLICT DO NOTHING RETURNING customer_id,amount),
       balance AS (
         UPDATE customers SET cashback_balance=cashback_balance+entry.amount,updated_at=now()
         FROM entry WHERE customers.id=entry.customer_id RETURNING customers.id)
       SELECT id,0 AS cashback_earned FROM o`, [orderId, scopeValue, previous]);
  } else {
    changed = await sql.query(
      `UPDATE orders SET status=$4,updated_at=now() WHERE id=$1 AND ${scopeColumn}=$2 AND status=$3 RETURNING id,0 AS cashback_earned`,
      [orderId, scopeValue, previous, next]);
  }
  if (!changed.length) return { ok: false, error: "O pedido mudou em outro aparelho. Atualize a tela.", status: 409 };
  await sql.query("INSERT INTO delivery_updates(order_id,status,actor_type) VALUES($1,$2,$3)", [orderId, next, actor]);
  if (next === "delivered" || next === "cancelled") await sql.query("DELETE FROM delivery_locations WHERE order_id=$1", [orderId]);
  return { ok: true, cashbackEarned: Number(changed[0].cashback_earned) || 0 };
}

/** Geocodificação opcional pelo Mapbox, usada só quando MAPBOX_ACCESS_TOKEN existe. */
export async function geocode(address: string, near?: { lat: number; lng: number } | null) {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token || address.length < 5) return null;
  const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
  url.searchParams.set("q", address);
  url.searchParams.set("country", "br");
  url.searchParams.set("limit", "1");
  url.searchParams.set("language", "pt");
  if (near) url.searchParams.set("proximity", `${near.lng},${near.lat}`);
  url.searchParams.set("access_token", token);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json() as { features?: { geometry?: { coordinates?: number[] } }[] };
    const c = data.features?.[0]?.geometry?.coordinates;
    if (!c || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) return null;
    return { lat: c[1], lng: c[0] };
  } catch { return null; }
}
