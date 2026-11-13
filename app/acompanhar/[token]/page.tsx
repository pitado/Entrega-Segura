"use client";
import {useCallback,useEffect,useState} from "react";
import {useParams} from "next/navigation";
import Link from "next/link";
import {Check,CheckCircle2,Clock3,MapPin,RefreshCw,ShieldCheck,Truck} from "lucide-react";
import MapSurface from "../../components/MapSurface";
type Status="preparing"|"on_route"|"arrived"|"delivered"|"cancelled";
type Info={order:{id:string;status:Status;destination:string;customer_ready:boolean;courier_name:string|null;latitude:number|null;longitude:number|null;recorded_at:string|null;created_at:string;delivered_at:string|null};updates:{status:string;actor_type:string;created_at:string}[]};
const names:Record<Status,string>={preparing:"Pedido em preparo",on_route:"Entregador a caminho",arrived:"Entregador chegou",delivered:"Pedido entregue",cancelled:"Pedido cancelado"};
const statuses:["preparing","on_route","arrived","delivered"]=["preparing","on_route","arrived","delivered"];
export default function TrackingPage(){
 const params=useParams<{token:string}>(),token=params.token;
 const [data,setData]=useState<Info|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{try{const res=await fetch("/api/tracking/"+encodeURIComponent(token),{cache:"no-store"});const value=await res.json();if(!res.ok)throw Error(value.error||"Não foi possível consultar");setData(value);setError("");}catch(e){setError((e as Error).message);}},[token]);
 useEffect(()=>{load();const timer=setInterval(load,8000);return()=>clearInterval(timer);},[load]);
 const confirm=async()=>{setBusy(true);try{const res=await fetch("/api/tracking/"+token,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"ready"})});if(!res.ok)throw Error("Não foi possível confirmar");await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const order=data?.order;
 const current=order?statuses.indexOf(order.status as typeof statuses[number]):-1;
 return <div className="shell"><header className="topbar"><Link className="wordmark" href="/"><span className="wordmark-symbol">ES</span><span>Entrega Segura<small>Acompanhamento do pedido</small></span></Link><span className="version-pill"><Truck size={14}/> Acompanhamento</span></header>
 <main className="tracking-shell"><span className="overline">ACOMPANHAMENTO / ATUALIZAÇÃO AUTOMÁTICA</span><div className="page-title"><div><h1>Sua entrega</h1><p>Acompanhe as etapas e saiba quando o entregador estiver próximo.</p></div><button className="button ghost-button" onClick={load}><RefreshCw size={15}/> Atualizar</button></div>
 {error&&<p className="inline-error">{error}</p>}
 {!order?<div className="empty-state">Buscando informações da entrega...</div>:<div className="tracking-grid">
 <section className="detail-panel"><span className={"status-tag status-"+order.status}>{names[order.status]}</span><h2 className="tracking-headline">{names[order.status]}</h2><p>{order.status==="on_route"?"O entregador iniciou o trajeto até você.":order.status==="arrived"?"O entregador informou que chegou ao destino.":order.status==="preparing"?"Seu pedido está sendo preparado.":order.status==="delivered"?"A entrega foi concluída.":"Esta entrega foi cancelada."}</p>
 <div className="details-pair"><span>Destino</span><strong>{order.destination}</strong></div><div className="details-pair"><span>Entregador</span><strong>{order.courier_name||"Aguardando atribuição"}</strong></div>
 <div className="timeline">{statuses.map((status,index)=><div className={"timeline-step "+(index<=current?"complete":"")} key={status}><div className="timeline-dot">{index<current?<Check size={12}/>:index+1}</div><div><strong>{names[status]}</strong><small>{index<=current?"Etapa registrada":"Aguardando"}</small></div></div>)}</div>
 {["on_route","arrived"].includes(order.status)&&<div className="customer-ready"><div><strong>Está pronto para receber?</strong><p>Confirme quando estiver preparado. O estabelecimento e o entregador verão sua confirmação.</p></div><button className="button main-button" disabled={busy||order.customer_ready} onClick={confirm}>{order.customer_ready?<><CheckCircle2 size={15}/> Confirmado</>: "Estou pronto para receber"}</button></div>}
 <div className="info-line"><ShieldCheck size={15}/><span>O mapa mostra o GPS compartilhado com consentimento. Atualizações podem atrasar por conexão ou restrições do navegador.</span></div>
 </section>
 <div className="tracking-map"><MapSurface destination={order.destination} latitude={order.latitude} longitude={order.longitude} updatedAt={order.recorded_at}/><p className="map-disclaimer">Não há estimativa de chegada calculada nesta versão. O mapa é atualizado quando a posição é enviada pelo entregador.</p></div>
 </div>}</main></div>;
}
