import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
export const runtime="nodejs";

type Point={lat:number;lng:number};
type RouteBody={demoStep?:number;orderToken?:string};
type DirectionsResult={code?:string;routes?:Array<{duration:number;distance:number;geometry:{type:string;coordinates:number[][]}}>};
const demoPoints:Point[]=[
 {lat:-23.42690,lng:-51.93566},{lat:-23.42635,lng:-51.93502},
 {lat:-23.42575,lng:-51.93420},{lat:-23.42513,lng:-51.93347},
 {lat:-23.42458,lng:-51.93272},{lat:-23.42396,lng:-51.93205},
 {lat:-23.42340,lng:-51.93125},{lat:-23.42281,lng:-51.93054},
 {lat:-23.42218,lng:-51.92980},{lat:-23.42154,lng:-51.92915},
 {lat:-23.42083,lng:-51.92850},{lat:-23.42018,lng:-51.92776}
];
const headers={"Cache-Control":"no-store","Referrer-Policy":"no-referrer","X-Robots-Tag":"noindex"};
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers});
const uuid=(v:unknown):v is string=>typeof v==="string"&&/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(v);
function point(lat:unknown,lng:unknown):Point|null{
 return typeof lat==="number"&&Number.isFinite(lat)&&Math.abs(lat)<=90&&
 typeof lng==="number"&&Number.isFinite(lng)&&Math.abs(lng)<=180?{lat,lng}:null;
}
async function getOrderPoints(token:string){
 const sql=db();
 const rows=await sql.query(
   "SELECT o.status,o.destination_latitude,o.destination_longitude,"+
   "CASE WHEN d.is_sharing=true AND d.recorded_at>now()-interval '2 minutes' THEN d.latitude "+
   "WHEN l.updated_at>now()-interval '2 minutes' THEN l.latitude END AS latitude,"+
   "CASE WHEN d.is_sharing=true AND d.recorded_at>now()-interval '2 minutes' THEN d.longitude "+
   "WHEN l.updated_at>now()-interval '2 minutes' THEN l.longitude END AS longitude "+
   "FROM orders o LEFT JOIN delivery_locations d ON d.order_id=o.id "+
   "LEFT JOIN order_locations l ON l.order_id=o.id "+
   "WHERE (o.tracking_token=$1::uuid OR o.courier_access_token=$1::uuid) "+
   "AND o.created_at>now()-interval '7 days' LIMIT 1",[token]);
 const order=rows[0];
 if(!order||!["on_route","arrived"].includes(String(order.status)))return null;
 const origin=point(order.latitude,order.longitude);
 const destination=point(order.destination_latitude,order.destination_longitude);
 return origin&&destination?{origin,destination}:null;
}
async function cacheKey(origin:Point,destination:Point,demo:boolean){
 const rounded=(v:number)=>v.toFixed(demo?5:3);
 const input=[demo?"demo":"order",rounded(origin.lat),rounded(origin.lng),rounded(destination.lat),rounded(destination.lng)].join(":");
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(input));
 return Array.from(new Uint8Array(digest)).map(v=>v.toString(16).padStart(2,"0")).join("");
}
export async function POST(request:Request){
 const originHeader=request.headers.get("origin");
 if(originHeader&&originHeader!==new URL(request.url).origin)return reply({error:"Origem não autorizada."},403);
 const token=process.env.MAPBOX_ACCESS_TOKEN;
 if(!token)return reply({error:"Mapbox ainda não configurado.",code:"not_configured"},503);
 let body:RouteBody;
 try{body=await request.json();}catch{return reply({error:"Solicitação inválida."},400);}
 if(!body||typeof body!=="object")return reply({error:"Solicitação inválida."},400);
 let origin:Point,destination:Point,demo=false;
 if(typeof body.demoStep==="number"&&Number.isInteger(body.demoStep)&&body.demoStep>=0&&body.demoStep<demoPoints.length){
   demo=true;origin=demoPoints[body.demoStep];destination=demoPoints[demoPoints.length-1];
 }else if(uuid(body.orderToken)){
   try{
     const result=await getOrderPoints(body.orderToken);
     if(!result)return reply({error:"Aguardando GPS ativo e destino confirmado.",code:"location_unavailable"},409);
     origin=result.origin;destination=result.destination;
   }catch{return reply({error:"Não foi possível consultar o pedido.",code:"database_unavailable"},503);}
 }else return reply({error:"Rota não autorizada."},403);
 if(origin.lat===destination.lat&&origin.lng===destination.lng){
   return reply({minutes:0,distanceKm:0,points:[[origin.lng,origin.lat],[destination.lng,destination.lat]],provider:"mapbox",demo});
 }
 let cache:Cache|undefined;
 let cacheRequest:Request|undefined;
 try{
   cache=(globalThis as unknown as {caches?:{default?:Cache}}).caches?.default;
   const hash=await cacheKey(origin,destination,demo);
   cacheRequest=new Request(new URL("/__es_route_cache/"+hash,request.url),{method:"GET"});
   if(cache){
     const cached=await cache.match(cacheRequest);
     if(cached)return reply(await cached.json());
   }
 }catch{/* cache is optional */}
 const coords=String(origin.lng)+","+String(origin.lat)+";"+String(destination.lng)+","+String(destination.lat);
 const url=new URL("https://api.mapbox.com/directions/v5/mapbox/driving-traffic/"+coords);
 url.searchParams.set("access_token",token);
 url.searchParams.set("geometries","geojson");
 url.searchParams.set("overview","full");
 url.searchParams.set("steps","false");
 url.searchParams.set("alternatives","false");
 try{
   const upstream=await fetch(url.toString(),{signal:AbortSignal.timeout(9000)});
   if(!upstream.ok)return reply({error:"Serviço de rotas indisponível.",code:"provider_error"},502);
   const data=(await upstream.json()) as DirectionsResult;
   const route=data.routes?.[0];
   if(data.code!=="Ok"||!route||!Array.isArray(route.geometry?.coordinates)||
      !Number.isFinite(route.duration)||!Number.isFinite(route.distance))return reply({error:"Rota não encontrada.",code:"no_route"},422);
   const points=route.geometry.coordinates;
   if(points.length>5000||!points.every(p=>p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])))
     return reply({error:"Rota inválida.",code:"invalid_route"},502);
   const result={minutes:Math.ceil(route.duration/60),distanceKm:Math.round(route.distance/100)/10,points,provider:"mapbox",demo};
   if(cache&&cacheRequest){
     try{await cache.put(cacheRequest,new Response(JSON.stringify(result),{headers:{"Content-Type":"application/json","Cache-Control":"public, max-age="+(demo?600:60)}}));}catch{}
   }
   return reply(result);
 }catch{return reply({error:"Não foi possível calcular a rota.",code:"provider_error"},502);}
}
