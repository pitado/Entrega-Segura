import {NextResponse} from "next/server";
import {db} from "../../../../lib/db";
import {hashToken,originAllowed,validAccessToken,validUuid} from "../../../../lib/security";
export const runtime="nodejs";
type Context={params:Promise<{token:string}>};
const headers={"Cache-Control":"no-store","Referrer-Policy":"no-referrer"};
const fail=(message:string,status=400)=>NextResponse.json({error:message},{status,headers});
async function courierFor(token:string) {
  if(!validAccessToken(token))return null;
  const hashed=await hashToken(token);
  const rows=await db().query("SELECT c.id,c.name,c.vehicle_type FROM courier_access_tokens t JOIN couriers c ON c.id=t.courier_id WHERE t.token_hash=$1 AND t.revoked_at IS NULL AND c.active=true LIMIT 1",[hashed]);
  return rows[0]||null;
}
export async function GET(_req:Request,{params}:Context) {
  try {
    const courier=await courierFor((await params).token);
    if(!courier)return fail("Acesso inválido ou revogado",401);
    const orders=await db().query("SELECT id,customer_name,destination,destination_latitude,destination_longitude,tracking_token,notes,status,customer_ready,created_at FROM orders WHERE courier_id=$1 AND status NOT IN ('delivered','cancelled') ORDER BY created_at DESC LIMIT 50",[courier.id]);
    return NextResponse.json({courier,orders},{headers});
  }catch{return fail("Serviço indisponível",503);}
}
export async function POST(req:Request,{params}:Context) {
  if(!originAllowed(req))return fail("Origem não autorizada",403);
  try {
    const courier=await courierFor((await params).token);
    if(!courier)return fail("Acesso inválido ou revogado",401);
    const body=await req.json().catch(()=>({}));
    if(!validUuid(body.order_id))return fail("Pedido inválido");
    const sql=db();
    const orders=await sql.query("SELECT id,status FROM orders WHERE id=$1 AND courier_id=$2 LIMIT 1",[body.order_id,courier.id]);
    if(!orders.length)return fail("Entrega não atribuída a você",403);
    const current=String(orders[0].status);
    if(body.action==="status") {
      const transitions:Record<string,string[]>={preparing:["on_route"],on_route:["arrived"],arrived:["delivered"]};
      if(!(transitions[current]||[]).includes(body.status))return fail("Transição de status não permitida",409);
      await sql.query("UPDATE orders SET status=$1,updated_at=now(),delivered_at=CASE WHEN $1='delivered' THEN now() ELSE delivered_at END WHERE id=$2 AND courier_id=$3",[body.status,body.order_id,courier.id]);
      await sql.query("INSERT INTO delivery_updates(order_id,status,actor_type) VALUES($1,$2,'courier')",[body.order_id,body.status]);
      if(body.status==="delivered")await sql.query("DELETE FROM delivery_locations WHERE order_id=$1",[body.order_id]);
      return NextResponse.json({ok:true},{headers});
    }
    if(body.action==="location") {
      if(current!=="on_route"&&current!=="arrived")return fail("Inicie a entrega antes de compartilhar a localização",409);
      const lat=Number(body.latitude),lng=Number(body.longitude),accuracy=Number(body.accuracy_m);
      if(!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lng)||Math.abs(lng)>180||!Number.isFinite(accuracy)||accuracy<0||accuracy>10000)return fail("Localização inválida");
      await sql.query("INSERT INTO delivery_locations(order_id,courier_id,latitude,longitude,accuracy_m,is_sharing,recorded_at) VALUES($1,$2,$3,$4,$5,true,now()) ON CONFLICT(order_id) DO UPDATE SET courier_id=excluded.courier_id,latitude=excluded.latitude,longitude=excluded.longitude,accuracy_m=excluded.accuracy_m,is_sharing=true,recorded_at=now()",[body.order_id,courier.id,lat,lng,accuracy]);
      return NextResponse.json({ok:true},{headers});
    }
    if(body.action==="stop") {
      await sql.query("DELETE FROM delivery_locations WHERE order_id=$1 AND courier_id=$2",[body.order_id,courier.id]);
      return NextResponse.json({ok:true},{headers});
    }
    return fail("Ação desconhecida");
  }catch{return fail("Não foi possível atualizar a entrega",503);}
}
