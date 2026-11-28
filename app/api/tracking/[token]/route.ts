import { db } from "../../../../lib/db";
import { fail, ok, readJson } from "../../../../lib/http";
import { originAllowed, validUuid } from "../../../../lib/security";

export const runtime = "nodejs";
type Context = { params: Promise<{ token: string }> };
const fresh = "l.is_sharing=true AND l.recorded_at>now()-interval '2 minutes' AND o.status IN ('on_route','arrived')";

// Acompanhamento do cliente: só o necessário para a própria entrega, por 7 dias.
export async function GET(_request: Request, { params }: Context) {
  const token = (await params).token;
  if (!validUuid(token)) return fail("Link inválido");
  try {
    const sql = db();
    const rows = await sql.query(
      `SELECT o.id,o.number,o.status,o.destination,o.destination_latitude,o.destination_longitude,o.customer_ready,o.created_at,o.delivered_at,
         o.cancelled_at,o.customer_name,o.total_amount::float8 AS total_amount,o.cashback_used::float8 AS cashback_used,
         o.cashback_earned::float8 AS cashback_earned,c.name AS courier_name,
         e.name AS establishment_name,e.logo_url,e.phone AS establishment_phone,e.slug,e.menu_enabled,
         e.cashback_percent::float8 AS cashback_percent,e.latitude AS establishment_latitude,e.longitude AS establishment_longitude,
         cu.cashback_balance::float8 AS cashback_balance,
         CASE WHEN ${fresh} THEN l.latitude END AS latitude,CASE WHEN ${fresh} THEN l.longitude END AS longitude,
         CASE WHEN ${fresh} THEN l.accuracy_m END AS accuracy_m,CASE WHEN ${fresh} THEN l.recorded_at END AS recorded_at
       FROM orders o JOIN establishments e ON e.id=o.establishment_id LEFT JOIN couriers c ON c.id=o.courier_id
       LEFT JOIN customers cu ON cu.id=o.customer_id LEFT JOIN delivery_locations l ON l.order_id=o.id
       WHERE o.tracking_token=$1::uuid AND o.demo_session_id IS NULL AND o.created_at>now()-interval '7 days' LIMIT 1`, [token]);
    if (!rows.length) return fail("Entrega não encontrada ou link expirado", 404);
    const { id, ...order } = rows[0];
    const updates = await sql.query("SELECT status,actor_type,created_at FROM delivery_updates WHERE order_id=$1 ORDER BY created_at DESC LIMIT 12", [id]);
    return ok({ order, updates });
  } catch { return fail("Serviço indisponível", 503); }
}

export async function POST(request: Request, { params }: Context) {
  if (!originAllowed(request)) return fail("Origem não autorizada", 403);
  const token = (await params).token;
  if (!validUuid(token)) return fail("Link inválido");
  const body = await readJson(request);
  if (body.action !== "ready" && body.action !== "destination") return fail("Ação inválida");
  try {
    const sql = db();
    if (body.action === "destination") {
      const lat = body.latitude, lng = body.longitude;
      if (typeof lat !== "number" || !Number.isFinite(lat) || Math.abs(lat) > 90 || typeof lng !== "number" || !Number.isFinite(lng) || Math.abs(lng) > 180)
        return fail("Coordenadas inválidas");
      const rows = await sql.query(
        `UPDATE orders SET destination_latitude=$1,destination_longitude=$2,updated_at=now()
         WHERE tracking_token=$3::uuid AND demo_session_id IS NULL AND created_at>now()-interval '7 days' AND status IN ('preparing','on_route','arrived') RETURNING id`,
        [lat, lng, token]);
      if (!rows.length) return fail("Entrega não encontrada ou já finalizada", 404);
      await sql.query("INSERT INTO delivery_updates(order_id,status,actor_type) VALUES($1,'destination_confirmed','customer')", [rows[0].id]);
      return ok({ ok: true });
    }
    const updated = await sql.query(
      `UPDATE orders SET customer_ready=true,customer_ready_at=now(),updated_at=now()
       WHERE tracking_token=$1::uuid AND demo_session_id IS NULL AND status IN ('on_route','arrived') AND customer_ready=false AND created_at>now()-interval '7 days' RETURNING id`, [token]);
    if (updated.length) await sql.query("INSERT INTO delivery_updates(order_id,status,actor_type) VALUES($1,'customer_ready','customer')", [updated[0].id]);
    return ok({ ok: true, changed: updated.length > 0 });
  } catch { return fail("Não foi possível confirmar", 503); }
}
