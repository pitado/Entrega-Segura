import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { isUUID, isStatus, isCoordinate, noStore, recordEvent } from "../../../../../lib/ops";

export const runtime = "nodejs";
type Context = { params: Promise<{ token: string }> };
const invalid = () => NextResponse.json({ error: "Acesso de entregador inválido." }, { status: 404, headers: noStore });
async function findOrder(token: string) {
  const sql = db();
  const orders = await sql`SELECT o.id, o.customer_name, o.destination, o.status, o.customer_ready, o.created_at, o.courier_id, o.destination_latitude, o.destination_longitude, o.demo_session_id, l.latitude, l.longitude, l.accuracy_m, l.location_source, l.updated_at AS location_updated_at, c.name AS courier_name FROM public.orders o JOIN public.couriers c ON c.id=o.courier_id LEFT JOIN public.order_locations l ON l.order_id=o.id WHERE o.courier_access_token=${token}::uuid AND o.created_at > now() - interval '7 days' LIMIT 1`;
  return orders[0];
}
export async function GET(request: Request, { params }: Context) {
  const { token } = await params;
  if (!isUUID(token)) return invalid();
  const origin=request.headers.get("origin");
  if(origin && origin!==new URL(request.url).origin)return NextResponse.json({error:"Origem inválida"},{status:403,headers:noStore});
  try {
    const order = await findOrder(token);
    if (!order) return invalid();
    return NextResponse.json(order, { headers: noStore });
  } catch { return NextResponse.json({ error: "Serviço indisponível." }, { status: 503, headers: noStore }); }
}
export async function POST(request: Request, { params }: Context) {
  const { token } = await params;
  if (!isUUID(token)) return invalid();
  try {
    const order = await findOrder(token);
    if (!order) return invalid();
    const body = await request.json() as Record<string, unknown>;
    const sql = db();
    if (body.action === "status") {
      const next = body.status;
      if (!isStatus(next)) return NextResponse.json({ error: "Status inválido." }, { status: 400, headers: noStore });
      const permitted: Record<string, string[]> = {
        preparing: ["on_route"], on_route: ["arrived"], arrived: ["delivered"]
      };
      if (!permitted[String(order.status)]?.includes(next)) return NextResponse.json({ error: "Etapa não permitida." }, { status: 409, headers: noStore });
      const rows = await sql`UPDATE public.orders SET status=${next}, delivered_at=CASE WHEN ${next}='delivered' THEN now() ELSE delivered_at END WHERE id=${order.id}::uuid AND status=${order.status} RETURNING id`;
      if (!rows.length) return NextResponse.json({ error: "Pedido foi atualizado em outro dispositivo." }, { status: 409, headers: noStore });
      await recordEvent(String(order.id), `status:${next}`);
      if (next === "delivered") {
        await sql`DELETE FROM public.order_locations WHERE order_id=${order.id}::uuid`;
      }
      return NextResponse.json({ ok: true, status: next }, { headers: noStore });
    }
    if (body.action === "position") {
      if (!["on_route", "arrived"].includes(String(order.status))) return NextResponse.json({ error: "Inicie a rota antes de compartilhar o GPS." }, { status: 409, headers: noStore });
      const source = body.source === "simulation" ? "simulation" : "gps";
      if (source === "simulation" && !order.demo_session_id) return NextResponse.json({ error: "Simulação permitida apenas em pedidos de teste." }, { status: 403, headers: noStore });
      if (!isCoordinate(body.latitude, 90) || !isCoordinate(body.longitude, 180)) return NextResponse.json({ error: "Coordenadas inválidas." }, { status: 400, headers: noStore });
      const accuracy = typeof body.accuracy === "number" && body.accuracy >= 0 && body.accuracy < 50000 ? body.accuracy : null;
      await sql`INSERT INTO public.order_locations (order_id, courier_id, latitude, longitude, accuracy_m, location_source, updated_at) VALUES (${order.id}::uuid, ${order.courier_id}::uuid, ${body.latitude}, ${body.longitude}, ${accuracy}, ${source}, now()) ON CONFLICT (order_id) DO UPDATE SET latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, accuracy_m=EXCLUDED.accuracy_m, location_source=EXCLUDED.location_source, courier_id=EXCLUDED.courier_id, updated_at=now()`;
      return NextResponse.json({ ok: true }, { headers: noStore });
    }
    return NextResponse.json({ error: "Ação desconhecida." }, { status: 400, headers: noStore });
  } catch { return NextResponse.json({ error: "Não foi possível atualizar a entrega." }, { status: 503, headers: noStore }); }
}
