import { db } from "../../../../lib/db";
import { fail, ok, readJson } from "../../../../lib/http";
import { changeStatus, type Status } from "../../../../lib/orders";
import { hashToken, originAllowed, validAccessToken, validUuid } from "../../../../lib/security";
import { codeMatches, MAX_CODE_ATTEMPTS } from "../../../../lib/deliveryCode";

export const runtime = "nodejs";
type Context = { params: Promise<{ token: string }> };

async function courierFor(token: string) {
  if (!validAccessToken(token)) return null;
  const rows = await db().query(
    `SELECT c.id,c.name,c.vehicle_type,e.name AS establishment_name,e.address AS establishment_address,e.phone AS establishment_phone,
       e.latitude AS establishment_latitude,e.longitude AS establishment_longitude,e.logo_url
     FROM courier_access_tokens t JOIN couriers c ON c.id=t.courier_id JOIN establishments e ON e.id=c.establishment_id
     WHERE t.token_hash=$1 AND t.revoked_at IS NULL AND c.active=true LIMIT 1`, [await hashToken(token)]);
  return rows[0] || null;
}

export async function GET(_req: Request, { params }: Context) {
  try {
    const courier = await courierFor((await params).token);
    if (!courier) return fail("Link inválido ou desativado. Peça um novo link ao estabelecimento.", 401);
    const sql = db();
    const [orders, today] = await Promise.all([
      sql.query(
        `SELECT id,number,customer_name,customer_phone,destination,destination_latitude,destination_longitude,notes,status,customer_ready,
           total_amount::float8 AS total_amount,cashback_used::float8 AS cashback_used,created_at,
           greatest(0,$2-(SELECT count(*)::int FROM delivery_updates du WHERE du.order_id=orders.id AND du.status='code_failed')) AS code_attempts_left
         FROM orders WHERE courier_id=$1 AND status IN ('preparing','on_route','arrived') AND demo_session_id IS NULL
         ORDER BY created_at LIMIT 50`, [courier.id, MAX_CODE_ATTEMPTS]),
      sql.query(
        `SELECT count(*)::int AS delivered FROM orders WHERE courier_id=$1 AND status='delivered'
           AND delivered_at>=date_trunc('day',now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'`, [courier.id]),
    ]);
    return ok({ courier, orders, today: today[0] });
  } catch { return fail("Serviço indisponível", 503); }
}

export async function POST(req: Request, { params }: Context) {
  if (!originAllowed(req)) return fail("Origem não autorizada", 403);
  try {
    const courier = await courierFor((await params).token);
    if (!courier) return fail("Link inválido ou desativado", 401);
    const body = await readJson(req);
    if (!validUuid(body.order_id)) return fail("Pedido inválido");
    const sql = db();
    const orders = await sql.query("SELECT id,status,tracking_token FROM orders WHERE id=$1 AND courier_id=$2 AND demo_session_id IS NULL LIMIT 1", [body.order_id, courier.id]);
    if (!orders.length) return fail("Entrega não atribuída a você", 403);
    const current = String(orders[0].status);
    if (body.action === "status") {
      // Concluir exige o código de entrega que o cliente vê na tela dele.
      if (body.status === "delivered" && (current === "on_route" || current === "arrived")) {
        const failedRows = await sql.query("SELECT count(*)::int AS n FROM delivery_updates WHERE order_id=$1 AND status='code_failed'", [body.order_id]);
        const failed = Number(failedRows[0]?.n) || 0;
        if (failed >= MAX_CODE_ATTEMPTS) return fail("Muitas tentativas com o código errado. Peça ao estabelecimento para concluir a entrega.", 429);
        if (!(await codeMatches(String(orders[0].tracking_token), body.code))) {
          await sql.query("INSERT INTO delivery_updates(order_id,status,actor_type) VALUES($1,'code_failed','courier')", [body.order_id]);
          const left = MAX_CODE_ATTEMPTS - failed - 1;
          return fail(left > 0 ? `Código incorreto. Confira com o cliente (${left} tentativa${left === 1 ? "" : "s"} restante${left === 1 ? "" : "s"}).`
            : "Código incorreto. Peça ao estabelecimento para concluir a entrega.", 422);
        }
        const result = await changeStatus(String(body.order_id), "delivered", "courier", { courierId: String(courier.id) });
        if (!result.ok) return fail(result.error, result.status);
        await sql.query("INSERT INTO delivery_updates(order_id,status,actor_type) VALUES($1,'code_verified','courier')", [body.order_id]);
        return ok({ ...result, verified: true });
      }
      const result = await changeStatus(String(body.order_id), String(body.status) as Status, "courier", { courierId: String(courier.id) });
      return result.ok ? ok(result) : fail(result.error, result.status);
    }
    if (body.action === "location") {
      if (current !== "on_route" && current !== "arrived") return fail("Inicie a entrega antes de compartilhar a localização", 409);
      const lat = Number(body.latitude), lng = Number(body.longitude), accuracy = Number(body.accuracy_m);
      if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180 || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 10000)
        return fail("Localização inválida");
      // Uma posição vale para todas as entregas em rota deste entregador.
      await sql.query(
        `INSERT INTO delivery_locations(order_id,courier_id,latitude,longitude,accuracy_m,is_sharing,recorded_at)
         SELECT id,$1,$2,$3,$4,true,now() FROM orders WHERE courier_id=$1 AND status IN ('on_route','arrived')
         ON CONFLICT(order_id) DO UPDATE SET courier_id=excluded.courier_id,latitude=excluded.latitude,longitude=excluded.longitude,
           accuracy_m=excluded.accuracy_m,is_sharing=true,recorded_at=now()`, [courier.id, lat, lng, accuracy]);
      return ok({ ok: true });
    }
    if (body.action === "stop") {
      await sql.query("DELETE FROM delivery_locations WHERE courier_id=$1", [courier.id]);
      return ok({ ok: true });
    }
    return fail("Ação desconhecida");
  } catch { return fail("Não foi possível atualizar a entrega", 503); }
}
