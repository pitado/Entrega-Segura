import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { isUUID, isCoordinate, noStore, recordEvent } from "../../../../../lib/ops";

export const runtime = "nodejs";
type Context = { params: Promise<{ token: string }> };
const missing = () => NextResponse.json({ error: "Pedido não encontrado ou link expirado." }, { status: 404, headers: noStore });

export async function GET(_request: Request, { params }: Context) {
  const { token } = await params;
  if (!isUUID(token)) return missing();
  try {
    const sql = db();
    const rows = await sql`SELECT o.id, o.status, o.customer_ready, o.customer_ready_at, o.destination, o.destination_latitude, o.destination_longitude, o.created_at, o.delivered_at, CASE WHEN o.status IN ('on_route','arrived') AND l.updated_at > now() - interval '3 minutes' THEN l.latitude ELSE null END AS latitude, CASE WHEN o.status IN ('on_route','arrived') AND l.updated_at > now() - interval '3 minutes' THEN l.longitude ELSE null END AS longitude, CASE WHEN o.status IN ('on_route','arrived') AND l.updated_at > now() - interval '3 minutes' THEN l.updated_at ELSE null END AS location_updated_at, CASE WHEN o.status IN ('on_route','arrived') AND l.updated_at > now() - interval '3 minutes' THEN l.location_source ELSE null END AS location_source FROM public.orders o LEFT JOIN public.order_locations l ON l.order_id=o.id WHERE o.tracking_token=${token}::uuid AND o.created_at > now() - interval '7 days' LIMIT 1`;
    return rows.length ? NextResponse.json(rows[0], { headers: noStore }) : missing();
  } catch { return NextResponse.json({ error: "Acompanhamento temporariamente indisponível." }, { status: 503, headers: noStore }); }
}
export async function POST(request: Request, { params }: Context) {
  const { token } = await params;
  if (!isUUID(token)) return missing();
  const origin=request.headers.get("origin");
  if(origin && origin!==new URL(request.url).origin)return NextResponse.json({error:"Origem inválida"},{status:403,headers:noStore});
  try {
    const sql = db();
    const body = await request.json() as Record<string, unknown>;
    if (body.action === "ready") {
      const rows = await sql`UPDATE public.orders SET customer_ready=true, customer_ready_at=COALESCE(customer_ready_at,now()) WHERE tracking_token=${token}::uuid AND created_at > now() - interval '7 days' AND status IN ('preparing','on_route','arrived') AND customer_ready=false RETURNING id`;
      if (rows.length) await recordEvent(String(rows[0].id), "customer_ready");
      return NextResponse.json({ ok: true }, { headers: noStore });
    }
    if (body.action === "destination") {
      if (!isCoordinate(body.latitude, 90) || !isCoordinate(body.longitude, 180))
        return NextResponse.json({ error: "Localização inválida." }, { status: 400, headers: noStore });
      const rows = await sql`UPDATE public.orders SET destination_latitude=${body.latitude}, destination_longitude=${body.longitude} WHERE tracking_token=${token}::uuid AND created_at > now() - interval '7 days' AND status IN ('preparing','on_route','arrived') RETURNING id`;
      if (!rows.length) return missing();
      await recordEvent(String(rows[0].id), "destination_confirmed");
      return NextResponse.json({ ok: true }, { headers: noStore });
    }
    return NextResponse.json({ error: "Ação inválida." }, { status: 400, headers: noStore });
  } catch { return NextResponse.json({ error: "Não foi possível concluir a solicitação." }, { status: 503, headers: noStore }); }
}
