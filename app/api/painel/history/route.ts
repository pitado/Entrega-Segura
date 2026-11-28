import { db } from "../../../../lib/db";
import { fail, ok, text } from "../../../../lib/http";
import { withAccount } from "../../../../lib/panel";
import { validUuid } from "../../../../lib/security";

export const runtime = "nodejs";
const day = (v: string | null) => v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;

// Histórico de entregas finalizadas, filtrado por período (datas no fuso de Brasília), status, entregador e busca.
export async function GET(req: Request) {
  return withAccount(req, async ({ establishment }) => {
    const url = new URL(req.url);
    const from = day(url.searchParams.get("from")), to = day(url.searchParams.get("to"));
    const status = url.searchParams.get("status");
    const courier = url.searchParams.get("courier");
    const q = text(url.searchParams.get("q"), 60);
    const page = Math.max(0, Math.min(200, Number(url.searchParams.get("page")) || 0));
    if (status && !["delivered", "cancelled"].includes(status)) return fail("Status inválido");
    if (courier && !validUuid(courier)) return fail("Entregador inválido");
    const where = ["o.establishment_id=$1", "o.demo_session_id IS NULL", "o.status IN ('delivered','cancelled')"];
    const args: unknown[] = [establishment.id];
    const add = (clause: string, value: unknown) => { args.push(value); where.push(clause.replace("?", "$" + args.length)); };
    if (from) add("o.created_at>=(?::date::timestamp AT TIME ZONE 'America/Sao_Paulo')", from);
    if (to) add("o.created_at<((?::date+1)::timestamp AT TIME ZONE 'America/Sao_Paulo')", to);
    if (status) add("o.status=?", status);
    if (courier) add("o.courier_id=?", courier);
    if (q) {
      const like = "%" + q.replace(/[%_\\]/g, "") + "%", num = q.replace(/\D/g, "");
      args.push(like);
      const a = args.length;
      let clause = `(o.customer_name ILIKE $${a} OR o.destination ILIKE $${a}`;
      if (num) { args.push("%" + num + "%", num); clause += ` OR o.customer_phone LIKE $${a + 1} OR o.number::text=$${a + 2}`; }
      where.push(clause + ")");
    }
    const filter = where.join(" AND ");
    const sql = db();
    const [rows, totals] = await Promise.all([
      sql.query(`SELECT o.id,o.number,o.customer_name,o.customer_phone,o.destination,o.status,o.created_at,o.delivered_at,o.cancelled_at,
          c.name AS courier_name,o.total_amount::float8 AS total_amount,o.cashback_used::float8 AS cashback_used,o.cashback_earned::float8 AS cashback_earned,
          CASE WHEN o.delivered_at IS NOT NULL THEN round(extract(epoch FROM o.delivered_at-o.created_at)/60)::int END AS minutes
        FROM orders o LEFT JOIN couriers c ON c.id=o.courier_id WHERE ${filter}
        ORDER BY o.created_at DESC LIMIT 50 OFFSET ${page * 50}`, args),
      sql.query(`SELECT count(*)::int AS total,count(*) FILTER (WHERE o.status='delivered')::int AS delivered,
          count(*) FILTER (WHERE o.status='cancelled')::int AS cancelled,
          coalesce(sum(o.total_amount) FILTER (WHERE o.status='delivered'),0)::float8 AS revenue,
          coalesce(sum(o.cashback_earned) FILTER (WHERE o.status='delivered'),0)::float8 AS cashback,
          round(avg(extract(epoch FROM o.delivered_at-o.created_at)/60) FILTER (WHERE o.status='delivered'))::int AS avg_minutes
        FROM orders o WHERE ${filter}`, args),
    ]);
    return ok({ orders: rows, totals: totals[0], page, hasMore: rows.length === 50 });
  });
}
