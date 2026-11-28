import { db } from "../../../lib/db";
import { ok } from "../../../lib/http";
import { planSummary, withAccount } from "../../../lib/panel";

export const runtime = "nodejs";

// Visão principal do painel: estabelecimento, plano, entregadores, pedidos em andamento e números do dia.
export async function GET(req: Request) {
  return withAccount(req, async ({ establishment, user }) => {
    const sql = db();
    const id = establishment.id;
    const [est, couriers, orders, stats] = await Promise.all([
      sql.query(`SELECT id,name,slug,phone,address,latitude,longitude,logo_url,brand_color,menu_description,menu_enabled,
        extra_couriers,cashback_percent::float8 AS cashback_percent,cashback_min_order::float8 AS cashback_min_order
        FROM establishments WHERE id=$1`, [id]),
      sql.query(`SELECT c.id,c.name,c.phone,c.active,c.created_at,(t.revoked_at IS NULL AND t.courier_id IS NOT NULL) AS has_link,
        (SELECT count(*)::int FROM orders o WHERE o.courier_id=c.id AND o.status IN ('preparing','on_route','arrived')) AS active_orders,
        (SELECT max(l.recorded_at) FROM delivery_locations l WHERE l.courier_id=c.id AND l.is_sharing) AS last_seen
        FROM couriers c LEFT JOIN courier_access_tokens t ON t.courier_id=c.id
        WHERE c.establishment_id=$1 AND c.demo_session_id IS NULL ORDER BY c.active DESC,c.created_at`, [id]),
      sql.query(`SELECT o.id,o.number,o.customer_name,o.customer_phone,o.destination,o.destination_latitude,o.destination_longitude,o.notes,
        o.status,o.customer_ready,o.tracking_token,o.created_at,o.updated_at,o.delivered_at,o.cancelled_at,o.courier_id,c.name AS courier_name,
        o.total_amount::float8 AS total_amount,o.cashback_used::float8 AS cashback_used,o.cashback_earned::float8 AS cashback_earned,
        CASE WHEN l.is_sharing AND l.recorded_at>now()-interval '2 minutes' THEN l.latitude END AS latitude,
        CASE WHEN l.is_sharing AND l.recorded_at>now()-interval '2 minutes' THEN l.longitude END AS longitude,
        l.recorded_at AS location_at,
        EXISTS(SELECT 1 FROM delivery_updates du WHERE du.order_id=o.id AND du.status='code_verified') AS code_verified
        FROM orders o LEFT JOIN couriers c ON c.id=o.courier_id LEFT JOIN delivery_locations l ON l.order_id=o.id
        WHERE o.establishment_id=$1 AND o.demo_session_id IS NULL
          AND (o.status IN ('preparing','on_route','arrived') OR o.updated_at>now()-interval '12 hours')
        ORDER BY (o.status IN ('preparing','on_route','arrived')) DESC,o.created_at DESC LIMIT 150`, [id]),
      sql.query(`SELECT count(*) FILTER (WHERE status='delivered')::int AS delivered,
        count(*) FILTER (WHERE status IN ('preparing','on_route','arrived'))::int AS active,
        coalesce(sum(total_amount) FILTER (WHERE status='delivered'),0)::float8 AS revenue,
        coalesce(sum(cashback_earned) FILTER (WHERE status='delivered'),0)::float8 AS cashback,
        round(avg(extract(epoch FROM delivered_at-created_at)/60) FILTER (WHERE status='delivered'))::int AS avg_minutes
        FROM orders WHERE establishment_id=$1 AND demo_session_id IS NULL
          AND created_at>=date_trunc('day',now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'`, [id]),
    ]);
    const e = est[0];
    const activeCouriers = couriers.filter(c => c.active).length;
    return ok({
      user,
      establishment: e,
      plan: planSummary(Number(e.extra_couriers), Boolean(e.menu_enabled), activeCouriers),
      couriers, orders, today: stats[0],
    });
  });
}
