import { db } from "../../../../../lib/db";
import { coordinate, digits, fail, ok, readJson, text } from "../../../../../lib/http";
import { changeStatus, type Status } from "../../../../../lib/orders";
import { withAccount } from "../../../../../lib/panel";
import { validUuid } from "../../../../../lib/security";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Context) {
  return withAccount(req, async ({ establishment }) => {
    const id = (await params).id;
    if (!validUuid(id)) return fail("Pedido inválido");
    const sql = db();
    const rows = await sql.query("SELECT id FROM orders WHERE id=$1 AND establishment_id=$2 AND demo_session_id IS NULL", [id, establishment.id]);
    if (!rows.length) return fail("Pedido não encontrado", 404);
    const updates = await sql.query("SELECT status,actor_type,created_at FROM delivery_updates WHERE order_id=$1 ORDER BY created_at", [id]);
    return ok({ updates });
  });
}

export async function PATCH(req: Request, { params }: Context) {
  return withAccount(req, async ({ establishment }) => {
    const id = (await params).id;
    if (!validUuid(id)) return fail("Pedido inválido");
    const body = await readJson(req);
    const sql = db();
    const eid = establishment.id;
    if (body.action === "assign") {
      const courierId = body.courier_id || null;
      if (courierId !== null && !validUuid(courierId)) return fail("Entregador inválido");
      if (courierId) {
        const c = await sql.query("SELECT 1 FROM couriers WHERE id=$1 AND establishment_id=$2 AND active AND demo_session_id IS NULL", [courierId, eid]);
        if (!c.length) return fail("Entregador não encontrado", 404);
      }
      const rows = await sql.query(
        "UPDATE orders SET courier_id=$1,updated_at=now() WHERE id=$2 AND establishment_id=$3 AND demo_session_id IS NULL AND status='preparing' RETURNING id",
        [courierId, id, eid]);
      if (!rows.length) return fail("O entregador só pode ser trocado antes da saída", 409);
      await sql.query("DELETE FROM delivery_locations WHERE order_id=$1", [id]);
      return ok({ ok: true });
    }
    if (body.action === "status") {
      const next = String(body.status) as Status;
      if (!["on_route", "arrived", "delivered", "cancelled"].includes(next)) return fail("Status inválido");
      const result = await changeStatus(id, next, "establishment", { establishmentId: eid });
      return result.ok ? ok(result) : fail(result.error, result.status);
    }
    if (body.action === "edit") {
      const name = text(body.customer_name, 90), destination = text(body.destination, 240), notes = text(body.notes, 300), phone = digits(body.customer_phone);
      if (name.length < 2 || destination.length < 5) return fail("Informe cliente e endereço");
      const point = coordinate(body.destination_latitude, body.destination_longitude);
      const rows = await sql.query(
        `UPDATE orders SET customer_name=$1,destination=$2,notes=$3,customer_phone=coalesce($4,customer_phone),
           destination_latitude=CASE WHEN $8 THEN $5 WHEN destination IS DISTINCT FROM $2 THEN NULL ELSE destination_latitude END,
           destination_longitude=CASE WHEN $8 THEN $6 WHEN destination IS DISTINCT FROM $2 THEN NULL ELSE destination_longitude END,
           updated_at=now()
         WHERE id=$7 AND establishment_id=$9 AND status IN ('preparing','on_route','arrived') RETURNING id`,
        [name, destination, notes || null, phone || null, point?.lat ?? null, point?.lng ?? null, id, Boolean(point), eid]);
      if (!rows.length) return fail("Pedido finalizado não pode ser editado", 409);
      return ok({ ok: true });
    }
    return fail("Ação desconhecida");
  });
}
