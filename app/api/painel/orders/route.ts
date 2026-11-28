import { db } from "../../../../lib/db";
import { digits, fail, money, ok, readJson, text, coordinate } from "../../../../lib/http";
import { geocode } from "../../../../lib/orders";
import { withAccount } from "../../../../lib/panel";
import { validUuid } from "../../../../lib/security";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return withAccount(req, async ({ establishment }) => {
    const body = await readJson(req);
    const eid = establishment.id;
    const customerName = text(body.customer_name, 90), destination = text(body.destination, 240);
    const notes = text(body.notes, 300), phone = digits(body.customer_phone);
    const total = body.total_amount === "" || body.total_amount == null ? null : money(body.total_amount);
    const useCashback = money(body.cashback_used ?? 0) ?? -1;
    const courierId = body.courier_id ? body.courier_id : null;
    if (customerName.length < 2) return fail("Informe o nome do cliente");
    if (destination.length < 5) return fail("Informe o endereço de entrega");
    if (phone && (phone.length < 10 || phone.length > 13)) return fail("Telefone inválido. Use DDD + número.");
    if (body.total_amount != null && body.total_amount !== "" && total === null) return fail("Valor do pedido inválido");
    if (useCashback < 0) return fail("Valor de cashback inválido");
    if (useCashback > 0 && !phone) return fail("Informe o telefone do cliente para usar o cashback");
    if (useCashback > 0 && (total === null || useCashback > total)) return fail("O cashback usado não pode passar do valor do pedido");
    if (courierId !== null && !validUuid(courierId)) return fail("Entregador inválido");

    const sql = db();
    if (courierId) {
      const c = await sql.query("SELECT 1 FROM couriers WHERE id=$1 AND establishment_id=$2 AND active AND demo_session_id IS NULL", [courierId, eid]);
      if (!c.length) return fail("Entregador não encontrado", 404);
    }
    let customerId: string | null = null;
    if (phone) {
      const c = await sql.query(
        `INSERT INTO customers(establishment_id,phone,name) VALUES($1,$2,$3)
         ON CONFLICT(establishment_id,phone) DO UPDATE SET name=excluded.name,updated_at=now() RETURNING id`, [eid, phone, customerName]);
      customerId = String(c[0].id);
    }
    let point = coordinate(body.destination_latitude, body.destination_longitude);
    if (!point) {
      const est = await sql.query("SELECT latitude,longitude FROM establishments WHERE id=$1", [eid]);
      point = await geocode(destination, coordinate(est[0]?.latitude, est[0]?.longitude));
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const rows = await sql.query(
          `WITH r AS (
             UPDATE customers SET cashback_balance=cashback_balance-$9::numeric,updated_at=now()
             WHERE $9::numeric>0 AND id=$8 AND establishment_id=$1 AND cashback_balance>=$9::numeric RETURNING id),
           o AS (
             INSERT INTO orders(establishment_id,courier_id,customer_name,customer_phone,destination,notes,customer_id,total_amount,cashback_used,
               destination_latitude,destination_longitude,number)
             SELECT $1,$2,$3,$4,$5,$6,$8,$7,$9::numeric,$10,$11,
               (SELECT coalesce(max(number),0)+1 FROM orders WHERE establishment_id=$1)
             WHERE $9::numeric=0 OR EXISTS(SELECT 1 FROM r)
             RETURNING id,number,tracking_token),
           e AS (
             INSERT INTO cashback_entries(establishment_id,customer_id,order_id,amount,kind)
             SELECT $1,$8,o.id,-$9::numeric,'redeem' FROM o WHERE $9::numeric>0)
           SELECT * FROM o`,
          [eid, courierId, customerName, phone || null, destination, notes || null, total, customerId, useCashback, point?.lat ?? null, point?.lng ?? null]);
        if (!rows.length) return fail("Saldo de cashback insuficiente para este cliente", 409);
        await sql.query("INSERT INTO delivery_updates(order_id,status,actor_type) VALUES($1,'preparing','establishment')", [rows[0].id]);
        return ok({ order: rows[0] }, 201);
      } catch (err) {
        // Dois pedidos criados ao mesmo tempo podem disputar o mesmo número: tenta de novo.
        if (String((err as { code?: string })?.code) !== "23505" || attempt === 2) throw err;
      }
    }
    return fail("Tente novamente", 503);
  });
}
