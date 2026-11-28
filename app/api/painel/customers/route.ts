import { db } from "../../../../lib/db";
import { digits, ok, text } from "../../../../lib/http";
import { withAccount } from "../../../../lib/panel";

export const runtime = "nodejs";

// Clientes e saldo de cashback. ?phone= devolve um cliente exato (usado ao criar pedido); ?q= busca por nome ou telefone.
export async function GET(req: Request) {
  return withAccount(req, async ({ establishment }) => {
    const url = new URL(req.url);
    const sql = db();
    const phone = digits(url.searchParams.get("phone"));
    if (url.searchParams.has("phone")) {
      if (phone.length < 10) return ok({ customer: null });
      const rows = await sql.query(
        "SELECT id,name,phone,cashback_balance::float8 AS cashback_balance FROM customers WHERE establishment_id=$1 AND phone=$2", [establishment.id, phone]);
      return ok({ customer: rows[0] || null });
    }
    const q = text(url.searchParams.get("q"), 60);
    const like = "%" + q.replace(/[%_\\]/g, "") + "%";
    const num = q.replace(/\D/g, "");
    const [customers, totals] = await Promise.all([
      sql.query(
        `SELECT c.id,c.name,c.phone,c.cashback_balance::float8 AS cashback_balance,c.created_at,
           count(o.id) FILTER (WHERE o.status='delivered')::int AS orders,
           coalesce(sum(o.total_amount) FILTER (WHERE o.status='delivered'),0)::float8 AS spent,
           max(o.created_at) AS last_order_at
         FROM customers c LEFT JOIN orders o ON o.customer_id=c.id
         WHERE c.establishment_id=$1 AND ($2='' OR c.name ILIKE $3 OR ($4<>'' AND c.phone LIKE '%'||$4||'%'))
         GROUP BY c.id ORDER BY max(o.created_at) DESC NULLS LAST LIMIT 100`, [establishment.id, q, like, num]),
      sql.query(
        `SELECT count(*)::int AS customers,coalesce(sum(cashback_balance),0)::float8 AS balance,
           (SELECT coalesce(sum(amount),0)::float8 FROM cashback_entries WHERE establishment_id=$1 AND kind='earn') AS earned,
           (SELECT coalesce(-sum(amount),0)::float8 FROM cashback_entries WHERE establishment_id=$1 AND kind='redeem') AS redeemed
         FROM customers WHERE establishment_id=$1`, [establishment.id]),
    ]);
    return ok({ customers, totals: totals[0] });
  });
}
