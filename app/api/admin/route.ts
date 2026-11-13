import {NextResponse} from "next/server";
import {db} from "../../../lib/db";
import {isAdmin,originAllowed,hashToken,validUuid} from "../../../lib/security";
export const runtime="nodejs";
const headers={"Cache-Control":"no-store","Referrer-Policy":"no-referrer"};
const fail=(message:string,status=400)=>NextResponse.json({error:message},{status,headers});
const clean=(v:unknown,max:number)=>typeof v==="string"?v.trim().slice(0,max):"";
type Body={action?:string;name?:string;customer_name?:string;customer_phone?:string;destination?:string;notes?:string;courier_id?:string|null;order_id?:string;status?:string};
export async function GET(req:Request) {
  if(!await isAdmin(req))return fail("Acesso restrito",401);
  try {
    const sql=db();
    const [establishments,couriers,orders]=await Promise.all([
      sql.query("SELECT id,name FROM establishments ORDER BY created_at DESC LIMIT 10",[]),
      sql.query("SELECT id,name,active,vehicle_type,establishment_id FROM couriers ORDER BY created_at DESC LIMIT 100",[]),
      sql.query("SELECT o.id,o.customer_name,o.customer_phone,o.destination,o.notes,o.status,o.customer_ready,o.tracking_token,o.created_at,o.delivered_at,o.courier_id,c.name AS courier_name,l.latitude,l.longitude,l.accuracy_m,l.recorded_at,l.is_sharing FROM orders o LEFT JOIN couriers c ON c.id=o.courier_id LEFT JOIN delivery_locations l ON l.order_id=o.id ORDER BY o.created_at DESC LIMIT 100",[])
    ]);
    return NextResponse.json({establishments,couriers,orders},{headers});
  } catch {return fail("Banco indisponível. Verifique DATABASE_URL.",503);}
}
export async function POST(req:Request) {
  if(!await isAdmin(req))return fail("Acesso restrito",401);
  if(!originAllowed(req))return fail("Origem não autorizada",403);
  const body=await req.json().catch(()=>({})) as Body;
  const sql=db();
  try {
    const action=body.action;
    if(action==="establishment") {
      const name=clean(body.name,90);
      if(name.length<2)return fail("Informe o nome do estabelecimento");
      const existing=await sql.query("SELECT id FROM establishments LIMIT 1",[]);
      if(existing.length)return fail("Estabelecimento já configurado",409);
      const rows=await sql.query("INSERT INTO establishments(name) VALUES($1) RETURNING id,name",[name]);
      return NextResponse.json({establishment:rows[0]},{headers});
    }
    const establishments=await sql.query("SELECT id FROM establishments ORDER BY created_at LIMIT 1",[]);
    if(!establishments.length)return fail("Cadastre o estabelecimento primeiro",409);
    const establishment_id=establishments[0].id as string;
    if(action==="courier") {
      const name=clean(body.name,90);
      if(name.length<2)return fail("Informe o nome do entregador");
      const token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,"0")).join("");
      const hash=await hashToken(token);
      const rows=await sql.query("INSERT INTO couriers(establishment_id,name) VALUES($1,$2) RETURNING id,name",[establishment_id,name]);
      await sql.query("INSERT INTO courier_access_tokens(courier_id,token_hash) VALUES($1,$2)",[rows[0].id,hash]);
      return NextResponse.json({courier:rows[0],courier_url:new URL("/entregador/"+token,req.url).toString()},{headers});
    }
    if(action==="courier_link") {
      if(!validUuid(body.courier_id))return fail("Entregador inválido");
      const token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,"0")).join("");
      const hash=await hashToken(token);
      const couriers=await sql.query("SELECT id FROM couriers WHERE id=$1 AND establishment_id=$2 AND active=true",[body.courier_id,establishment_id]);
      if(!couriers.length)return fail("Entregador não encontrado",404);
      await sql.query("INSERT INTO courier_access_tokens(courier_id,token_hash,revoked_at) VALUES($1,$2,NULL) ON CONFLICT(courier_id) DO UPDATE SET token_hash=excluded.token_hash,created_at=now(),revoked_at=NULL",[body.courier_id,hash]);
      return NextResponse.json({courier_url:new URL("/entregador/"+token,req.url).toString()},{headers});
    }
    if(action==="order") {
      const customer_name=clean(body.customer_name,90),destination=clean(body.destination,240),notes=clean(body.notes,300),phone=clean(body.customer_phone,30);
      if(customer_name.length<2||destination.length<5)return fail("Informe cliente e endereço de entrega");
      const courier_id=body.courier_id||null;
      if(courier_id&&!validUuid(courier_id))return fail("Entregador inválido");
      if(courier_id) {
        const c=await sql.query("SELECT id FROM couriers WHERE id=$1 AND establishment_id=$2 AND active=true",[courier_id,establishment_id]);
        if(!c.length)return fail("Entregador não encontrado",404);
      }
      const rows=await sql.query("INSERT INTO orders(establishment_id,courier_id,customer_name,customer_phone,destination,notes) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,tracking_token",[establishment_id,courier_id,customer_name,phone||null,destination,notes||null]);
      await sql.query("INSERT INTO delivery_updates(order_id,status,actor_type) VALUES($1,'preparing','establishment')",[rows[0].id]);
      return NextResponse.json({order:rows[0]}, {headers});
    }
    if(action==="assign") {
      if(!validUuid(body.order_id)||!validUuid(body.courier_id))return fail("Pedido ou entregador inválido");
      const c=await sql.query("SELECT id FROM couriers WHERE id=$1 AND establishment_id=$2 AND active=true",[body.courier_id,establishment_id]);
      if(!c.length)return fail("Entregador não encontrado",404);
      const rows=await sql.query("UPDATE orders SET courier_id=$1,updated_at=now() WHERE id=$2 AND establishment_id=$3 AND status IN ('preparing','on_route') RETURNING id",[body.courier_id,body.order_id,establishment_id]);
      if(!rows.length)return fail("Não foi possível atribuir o pedido",409);
      return NextResponse.json({ok:true},{headers});
    }
    if(action==="status") {
      if(!validUuid(body.order_id)||!["preparing","on_route","arrived","delivered","cancelled"].includes(body.status||""))return fail("Dados inválidos");
      const rows=await sql.query("UPDATE orders SET status=$1,updated_at=now(),delivered_at=CASE WHEN $1='delivered' THEN now() ELSE delivered_at END WHERE id=$2 AND establishment_id=$3 RETURNING id",[body.status,body.order_id,establishment_id]);
      if(!rows.length)return fail("Pedido não encontrado",404);
      await sql.query("INSERT INTO delivery_updates(order_id,status,actor_type) VALUES($1,$2,'establishment')",[body.order_id,body.status]);
      if(body.status==="delivered"||body.status==="cancelled")await sql.query("UPDATE delivery_locations SET is_sharing=false WHERE order_id=$1",[body.order_id]);
      return NextResponse.json({ok:true},{headers});
    }
    return fail("Ação desconhecida");
  }catch{return fail("Não foi possível salvar. Confira o banco e tente novamente.",503);}
}
