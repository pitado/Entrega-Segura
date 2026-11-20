"use client";
import {useCallback,useEffect,useState} from "react";
import {useParams} from "next/navigation";
import Link from "next/link";
import {Check,CheckCircle2,Clock3,MapPin,RefreshCw,ShieldCheck,Truck} from "lucide-react";
import MapSurface from "../../components/MapSurface";
type Status="preparing"|"on_route"|"arrived"|"delivered"|"cancelled";
type Info={order:{id:string;status:Status;destination:string;destination_latitude:number|null;destination_longitude:number|null;customer_ready:boolean;courier_name:string|null;latitude:number|null;longitude:number|null;recorded_at:string|null;created_at:string;delivered_at:string|null};updates:{status:string;actor_type:string;created_at:string}[]};
const names:Record<Status,string>={preparing:"Pedido em preparo",on_route:"Entregador a caminho",arrived:"Entregador chegou",delivered:"Pedido entregue",cancelled:"Pedido cancelado"};
const statuses:["preparing","on_route","arrived","delivered"]=["preparing","on_route","arrived","delivered"];
export default function TrackingPage(){
 const params=useParams<{token:string}>(),token=params.token;
 const [data,setData]=useState<Info|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const [locating,setLocating]=useState(false);
 const load=useCallback(async()=>{try{const res=await fetch("/api/tracking/"+encodeURIComponent(token),{cache:"no-store"});const value=await res.json();if(!res.ok)throw Error(value.error||"Não foi possível consultar");setData(value);setError("");}catch(e){setError((e as Error).message);}},[token]);
 useEffect(()=>{load();const timer=setInterval(load,5000);return()=>clearInterval(timer);},[load]);
 const confirm=async()=>{setBusy(true);try{const res=await fetch("/api/tracking/"+token,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"ready"})});if(!res.ok)throw Error("Não foi possível confirmar");await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const confirmDestination=()=>{
   if(!navigator.geolocation){setError("Este aparelho não oferece localização.");return;}
   setLocating(true);setError("");
   navigator.geolocation.getCurrentPosition(async position=>{
     try{
       const res=await fetch("/api/tracking/"+encodeURIComponent(token),{
         method:"POST",headers:{"Content-Type":"application/json"},
         body:JSON.stringify({action:"destination",latitude:position.coords.latitude,longitude:position.coords.longitude})
       });
       const value=await res.json();
       if(!res.ok)throw Error(value.error||"Não foi possível confirmar a localização.");
       await load();
     }catch(e){setError((e as Error).message);}
     finally{setLocating(false);}
   },err=>{setLocating(false);setError("Não foi possível acessar sua localização: "+err.message);},
   {enableHighAccuracy:true,maximumAge:0,timeout:20000});
 };
 const order=data?.order;
 const current=order?statuses.indexOf(order.status as typeof statuses[number]):-1;
 return <div className="shell es-v3-site"><header className="topbar"><Link className="wordmark" href="/"><span>Entrega Segura</span></Link></header>
 <main className="tracking-shell es-v3-live-tracking es4-live-tracking"><div className="page-title"><div><span className="es-v3-eyebrow">ACOMPANHAMENTO</span><h1>Seu pedido<span className="es-v3-title-dot">.</span></h1><p>Atualizações em cada etapa, sem precisar instalar nada.</p></div><button className="button ghost-button" onClick={load}><RefreshCw size={15}/> Atualizar</button></div>
 {order&&<section className="es4-customer-hero" aria-label="Status atual do pedido"><div className="es4-customer-hero-copy"><span className="es4-pill es4-white-label">PEDIDO #{order.id.slice(0,8).toUpperCase()}</span><h2>{order.status==="delivered"?"Chegou. Tudo certo!":order.status==="arrived"?"Já chegou!":order.status==="on_route"?"Tá chegando.":order.status==="cancelled"?"Pedido cancelado.":"Está sendo preparado."}</h2><p>{order.status==="on_route"?"O entregador iniciou a rota até você.":order.status==="delivered"?"Entrega registrada como concluída.":order.status==="cancelled"?"Consulte o estabelecimento para informações.":"Acompanhe as etapas deste pedido em tempo real."}</p><span className={"es4-customer-status status-"+order.status}>{names[order.status]} <span>↗</span></span></div><EditorialArt className="es4-customer-hero-art" variant="tracking"/><span className="es4-customer-star" aria-hidden="true">✳</span></section>}
 
 {error&&<p className="inline-error">{error}</p>}
 {!order?<div className="empty-state">Buscando informações da entrega...</div>:<div className="tracking-grid es-v3-customer-grid es4-customer-grid">
 <section className="detail-panel es-v3-customer-details es4-customer-details"><div className="es4-section-heading"><div><span className="es4-kicker">DETALHES</span><h3>Seu pedido</h3></div><div className="es4-section-symbol"><ShieldCheck size={20}/></div></div><span className={"status-tag status-"+order.status}>{names[order.status]}</span><p>{order.status==="on_route"?"O entregador iniciou o trajeto até você.":order.status==="arrived"?"O entregador informou que chegou ao destino.":order.status==="preparing"?"Seu pedido está sendo preparado.":order.status==="delivered"?"A entrega foi concluída.":"Esta entrega foi cancelada."}</p>
 <div className="details-pair"><span>Destino</span><strong>{order.destination}</strong></div><div className="details-pair"><span>Entregador</span><strong>{order.courier_name||"Aguardando atribuição"}</strong></div><div className="details-pair"><span>Localização</span><strong>{order.recorded_at?"Compartilhada":"Aguardando GPS"}</strong></div>
 <div className="details-pair"><span>Destino no mapa</span><strong>{order.destination_latitude!==null&&order.destination_longitude!==null?"Localizado":"A confirmar"}</strong></div>
 {["preparing","on_route","arrived"].includes(order.status)&&
 <div className="customer-destination">
 <div><strong>Confirmar meu ponto de entrega</strong><p>Opcional: utiliza sua posição uma vez, com permissão do aparelho, para localizar melhor o destino.</p></div>
 <button className="button ghost-button" disabled={locating} onClick={confirmDestination} type="button">{locating?"Localizando...":"Usar minha localização"}</button>
 </div>}
 <div className="timeline">{statuses.map((status,index)=><div className={"timeline-step "+(index<=current?"complete":"")} key={status}><div className="timeline-dot">{index<current?<Check size={12}/>:index+1}</div><div><strong>{names[status]}</strong><small>{index<=current?"Etapa registrada":"Aguardando"}</small></div></div>)}</div>
 {["on_route","arrived"].includes(order.status)&&<div className="customer-ready"><div><strong>Está pronto para receber?</strong><p>Confirme quando estiver preparado. O estabelecimento e o entregador verão sua confirmação.</p></div><button className="button main-button" disabled={busy||order.customer_ready} onClick={confirm}>{order.customer_ready?<><CheckCircle2 size={15}/> Confirmado</>: "Estou pronto para receber"}</button></div>}
 
 </section>
 <div className="tracking-map es-v3-customer-map es4-customer-map"><div className="es-v3-map-panel-heading"><div><span className="es-v3-eyebrow">TRAJETO</span><h2>Onde está a entrega?</h2></div><span className="es-v3-map-label">Localização quando disponível</span></div><MapSurface orderToken={token} destination={order.destination} destinationLatitude={order.destination_latitude} destinationLongitude={order.destination_longitude} status={order.status} latitude={order.latitude} longitude={order.longitude} updatedAt={order.recorded_at}/><div className="map-live-state"><span className={order.recorded_at?"signal-dot active":"signal-dot"}/><strong>{order.status==="delivered"?"Entrega finalizada":order.recorded_at?"Motoboy localizado":"Aguardando posição do entregador"}</strong>{order.recorded_at&&<span>Última atualização: {new Date(order.recorded_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span>}</div></div>
 </div>}</main></div>;
}
