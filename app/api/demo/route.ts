import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { isUUID, noStore } from "../../../lib/ops";

export const runtime = "nodejs";
const reply = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: noStore });
async function auth(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!isUUID(token)) return null;
  const sql = db();
  const sessions = await sql`SELECT id, created_at, expires_at FROM public.demo_sessions WHERE access_token=${token}::uuid AND expires_at>now() LIMIT 1`;
  return sessions[0] || null;
}
export async function GET(request: Request) {
  try {
    const session = await auth(request);
    if (!session) return reply({ error: "Sessão de demonstração expirada. Inicie outra." }, 401);
    const sql = db();
    const [couriers, orders] = await Promise.all([
      sql`SELECT id, name, active FROM public.couriers WHERE demo_session_id=${session.id}::uuid ORDER BY created_at`,
      sql`SELECT o.id, o.customer_name, o.destination, o.status, o.customer_ready, o.tracking_token, o.courier_access_token, o.courier_id, o.created_at, o.delivered_at, o.destination_latitude, o.destination_longitude, c.name AS courier_name, l.latitude, l.longitude, l.accuracy_m, l.location_source, l.updated_at AS location_updated_at FROM public.orders o LEFT JOIN public.couriers c ON c.id=o.courier_id LEFT JOIN public.order_locations l ON l.order_id=o.id WHERE o.demo_session_id=${session.id}::uuid ORDER BY o.created_at DESC LIMIT 40`
    ]);
    return reply({ session: { expires_at: session.expires_at }, couriers, orders });
  } catch { return reply({ error: "Não foi possível consultar os pedidos no Neon." }, 503); }
}
export async function POST(request: Request) {
  const origin=request.headers.get("origin");
  if(origin && origin!==new URL(request.url).origin) return reply({error:"Origem não autorizada."},403);
  try {
    const body = await request.json() as Record<string, unknown>;
    const action = body.action;
    const sql = db();
    if (action === "start") {
      const recent = await sql`SELECT count(*)::int AS total FROM public.demo_sessions WHERE created_at>now()-interval '1 hour'`;
      if (Number(recent[0]?.total || 0) >= 150) return reply({ error: "Limite de novos ambientes de demonstração atingido." }, 429);
      const establishments = await sql`SELECT id FROM public.establishments WHERE name='Operação piloto' LIMIT 1`;
      if (!establishments.length) return reply({ error: "Estabelecimento de teste não configurado." }, 503);
      const session = await sql`INSERT INTO public.demo_sessions DEFAULT VALUES RETURNING id, access_token, expires_at`;
      const sid = session[0].id;
      const courier = await sql`INSERT INTO public.couriers (establishment_id,name,demo_session_id) VALUES (${establishments[0].id}::uuid,'Entregador de teste',${sid}::uuid) RETURNING id`;
      await sql`INSERT INTO public.orders (establishment_id,courier_id,customer_name,destination,destination_latitude,destination_longitude,demo_session_id) VALUES (${establishments[0].id}::uuid,${courier[0].id}::uuid,'Cliente de teste','Centro, Maringá - PR',-23.4210,-51.9330,${sid}::uuid)`;
      return reply({ access_token: session[0].access_token, expires_at: session[0].expires_at }, 201);
    }
    const session = await auth(request);
    if (!session) return reply({ error: "Ambiente de teste expirado." }, 401);
    if (action === "order") {
      const name = typeof body.customer === "string" ? body.customer.trim().slice(0,60) : "";
      const destination = typeof body.destination === "string" ? body.destination.trim().slice(0,150) : "";
      if (name.length < 2 || destination.length < 3) return reply({ error: "Informe o cliente e o destino." }, 400);
      const total = await sql`SELECT count(*)::int AS total FROM public.orders WHERE demo_session_id=${session.id}::uuid`;
      if (Number(total[0]?.total || 0) >= 20) return reply({ error: "Máximo de 20 pedidos por ambiente de demonstração." }, 429);
      const [courier] = await sql`SELECT id,establishment_id FROM public.couriers WHERE demo_session_id=${session.id}::uuid AND active=true ORDER BY created_at LIMIT 1`;
      if (!courier) return reply({ error: "Cadastre um entregador primeiro." }, 400);
      const rows = await sql`INSERT INTO public.orders(establishment_id,courier_id,customer_name,destination,demo_session_id) VALUES (${courier.establishment_id}::uuid,${courier.id}::uuid,${name},${destination},${session.id}::uuid) RETURNING id,tracking_token,courier_access_token`;
      return reply(rows[0], 201);
    }
    if (action === "courier") {
      const name = typeof body.name === "string" ? body.name.trim().slice(0,60) : "";
      if (name.length < 2) return reply({ error: "Nome inválido." }, 400);
      const total = await sql`SELECT count(*)::int AS total FROM public.couriers WHERE demo_session_id=${session.id}::uuid`;
      if (Number(total[0]?.total || 0) >= 5) return reply({ error: "Máximo de cinco entregadores por ambiente." }, 429);
      const [establishment] = await sql`SELECT id FROM public.establishments WHERE name='Operação piloto' LIMIT 1`;
      const rows = await sql`INSERT INTO public.couriers (establishment_id,name,demo_session_id) VALUES (${establishment.id}::uuid,${name},${session.id}::uuid) RETURNING id,name,active`;
      return reply(rows[0], 201);
    }
    if (action === "assign") {
      if (!isUUID(body.order_id) || !isUUID(body.courier_id)) return reply({ error: "Pedido ou entregador inválido." }, 400);
      const rows = await sql`UPDATE public.orders o SET courier_id=${body.courier_id}::uuid FROM public.couriers c WHERE o.id=${body.order_id}::uuid AND o.demo_session_id=${session.id}::uuid AND o.status='preparing' AND c.id=${body.courier_id}::uuid AND c.demo_session_id=${session.id}::uuid RETURNING o.id`;
      if (!rows.length) return reply({ error: "Não foi possível atribuir este entregador." }, 409);
      await sql`DELETE FROM public.order_locations WHERE order_id=${body.order_id}::uuid`;
      return reply({ ok: true });
    }
    return reply({ error: "Ação não reconhecida." }, 400);
  } catch { return reply({ error: "Não foi possível atualizar o ambiente no Neon." }, 503); }
}
