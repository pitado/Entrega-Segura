import {NextResponse} from "next/server";
import {db} from "../../../../lib/db";
import {validUuid,originAllowed} from "../../../../lib/security";
export const runtime="nodejs";
type Context={params:Promise<{token:string}>};
const headers={"Cache-Control":"no-store","Referrer-Policy":"no-referrer"};
const fail=(message:string,status=400)=>NextResponse.json({error:message},{status,headers});
export async function GET(_request:Request,{params}:Context) {
  const token=(await params).token;
  if(!validUuid(token))return fail("Link inválido");
  try {
    const sql=db();
    const rows=await sql.query("SELECT o.id,o.status,o.destination,o.customer_ready,o.created_at,o.delivered_at,c.name AS courier_name,CASE WHEN l.is_sharing=true AND l.recorded_at>now()-interval '2 minutes' AND o.status IN ('on_route','arrived') THEN l.latitude END AS latitude,CASE WHEN l.is_sharing=true AND l.recorded_at>now()-interval '2 minutes' AND o.status IN ('on_route','arrived') THEN l.longitude END AS longitude,CASE WHEN l.is_sharing=true AND l.recorded_at>now()-interval '2 minutes' THEN l.accuracy_m END AS accuracy_m,CASE WHEN l.is_sharing=true AND l.recorded_at>now()-interval '2 minutes' THEN l.recorded_at END AS recorded_at FROM orders o LEFT JOIN couriers c ON c.id=o.courier_id LEFT JOIN delivery_locations l ON l.order_id=o.id WHERE o.tracking_token=$1::uuid AND o.created_at>now()-interval '7 days' LIMIT 1",[token]);
    if(!rows.length)return fail("Entrega não encontrada ou link expirado",404);
    const updates=await sql.query("SELECT status,actor_type,created_at FROM delivery_updates WHERE order_id=$1 ORDER BY created_at DESC LIMIT 8",[rows[0].id]);
    return NextResponse.json({order:rows[0],updates},{headers});
  }catch{return fail("Serviço indisponível",503);}
}
export async function POST(request:Request,{params}:Context) {
  if(!originAllowed(request))return fail("Origem não autorizada",403);
  const token=(await params).token;
  if(!validUuid(token))return fail("Link inválido");
  const body=await request.json().catch(()=>({}));
  if(body.action!=="ready")return fail("Ação inválida");
  try {
    const sql=db();
    const updated=await sql.query("UPDATE orders SET customer_ready=true,updated_at=now() WHERE tracking_token=$1::uuid AND status IN ('on_route','arrived') AND customer_ready=false AND created_at>now()-interval '7 days' RETURNING id",[token]);
    if(updated.length)await sql.query("INSERT INTO delivery_updates(order_id,status,actor_type) VALUES($1,'customer_ready','customer')",[updated[0].id]);
    return NextResponse.json({ok:true,changed:updated.length>0},{headers});
  }catch{return fail("Não foi possível confirmar",503);}
}
