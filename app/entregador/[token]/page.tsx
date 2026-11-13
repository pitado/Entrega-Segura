"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {useParams} from "next/navigation";
import Link from "next/link";
import {CheckCircle2,MapPin,Navigation,Radio,RefreshCw,Shield,Truck,WifiOff} from "lucide-react";
import MapSurface from "../../components/MapSurface";
type Status="preparing"|"on_route"|"arrived"|"delivered"|"cancelled";
type Order={id:string;customer_name:string;destination:string;destination_latitude:number|null;destination_longitude:number|null;tracking_token:string;notes:string|null;status:Status;customer_ready:boolean;created_at:string};
type Response={courier:{id:string;name:string};orders:Order[]};
const statusName:Record<Status,string>={preparing:"Em preparo",on_route:"Em rota",arrived:"No destino",delivered:"Entregue",cancelled:"Cancelado"};
const next:Partial<Record<Status,{value:Status;label:string}>>={preparing:{value:"on_route",label:"Iniciar entrega"},on_route:{value:"arrived",label:"Cheguei ao destino"},arrived:{value:"delivered",label:"Confirmar entrega"}};
export default function CourierPage(){
 const params=useParams<{token:string}>(),token=params.token;
 const [data,setData]=useState<Response|null>(null);
 const [orderId,setOrderId]=useState("");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const [gps,setGps]=useState<"off"|"starting"|"on"|"error">("off");
 const [coords,setCoords]=useState<{lat:number;lng:number;accuracy:number;at:string}|null>(null);
 const watch=useRef<number|null>(null),lastSent=useRef(0),sharingOrder=useRef("");
 const api="/api/courier/"+encodeURIComponent(token);
 const refresh=useCallback(async()=>{
   try{const res=await fetch(api,{cache:"no-store"});const result=await res.json();if(!res.ok)throw Error(result.error||"Acesso inválido");setData(result);setError("");setOrderId(current=>result.orders.some((o:Order)=>o.id===current)?current:(result.orders[0]?.id||""));}catch(e){setError((e as Error).message);}},[api]);
 useEffect(()=>{refresh();const timer=setInterval(refresh,12000);return()=>clearInterval(timer);},[refresh]);
 const send=async(body:Record<string,unknown>)=>{const r=await fetch(api,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store"});const j=await r.json();if(!r.ok)throw Error(j.error||"Não foi possível atualizar");return j;};
 const stop=async()=>{if(watch.current!==null){navigator.geolocation.clearWatch(watch.current);watch.current=null;}const id=sharingOrder.current;sharingOrder.current="";setGps("off");if(id)await send({action:"stop",order_id:id}).catch(()=>{});};
 useEffect(()=>()=>{if(watch.current!==null)navigator.geolocation.clearWatch(watch.current);const id=sharingOrder.current;if(id)fetch(api,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"stop",order_id:id}),keepalive:true}).catch(()=>{});},[api]);
 const selected=data?.orders.find(o=>o.id===orderId)||null;
 const change=async(status:Status)=>{if(!selected)return;setBusy(true);try{await send({action:"status",order_id:selected.id,status});if(status==="delivered")await stop();await refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const start=()=>{
   if(!selected||!["on_route","arrived"].includes(selected.status)){setError("Inicie a rota antes de compartilhar a localização.");return;}
   if(!("geolocation" in navigator)){setError("Este navegador não oferece geolocalização.");return;}
   if(watch.current!==null)return;
   setGps("starting");setError("");sharingOrder.current=selected.id;
   watch.current=navigator.geolocation.watchPosition(async pos=>{
     const now=Date.now(),point={lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy,at:new Date().toISOString()};
     setCoords(point);setGps("on");
     if(now-lastSent.current<12000)return;
     lastSent.current=now;
     try{await send({action:"location",order_id:sharingOrder.current,latitude:point.lat,longitude:point.lng,accuracy_m:point.accuracy});}catch(e){setError((e as Error).message);setGps("error");}
   },e=>{setError("GPS indisponível: "+e.message);setGps("error");if(watch.current!==null){navigator.geolocation.clearWatch(watch.current);watch.current=null;}},{enableHighAccuracy:true,maximumAge:5000,timeout:20000});
 };
 return <div className="shell"><header className="topbar"><Link href="/" className="wordmark"><span>Entrega Segura</span></Link></header><main className="courier-shell">
 <div className="page-title"><div><h1>{data?"Olá, "+data.courier.name:"Minhas entregas"}</h1></div><button className="button ghost-button" onClick={refresh}><RefreshCw size={16}/> Atualizar</button></div>
 {error&&<p className="inline-error">{error}</p>}
 {!data?<div className="empty-state">Verificando acesso e carregando suas entregas...</div>:
 <div className="courier-grid"><div className="order-panel"><div className="section-top"><div><h2>Fila de entregas</h2></div></div><div className="order-list">{data.orders.length?data.orders.map(o=><button key={o.id} onClick={async()=>{if(gps!=="off")await stop();setCoords(null);setOrderId(o.id);}} className={"order-row "+(orderId===o.id?"row-active":"")}><span className="row-top"><strong>{o.customer_name}</strong><span className={"status-tag status-"+o.status}>{statusName[o.status]}</span></span><span className="row-address"><MapPin size={14}/>{o.destination}</span><span className="row-end">{o.customer_ready?"Cliente confirmou que está pronto":"Aguardando cliente"}</span></button>):<div className="empty-state">Sem pedidos atribuídos. Você já pode deixar esta página aberta para receber entregas.</div>}</div></div>
 <section className="detail-panel courier-detail">{selected?<><h2>{selected.customer_name}</h2><p className="detail-address">{selected.destination}</p><div className="details-pair"><span>Status</span><strong>{statusName[selected.status]}</strong></div><div className="details-pair"><span>Cliente pronto para receber</span><strong>{selected.customer_ready?"Sim":"Ainda não"}</strong></div>{selected.notes&&<div className="details-pair"><span>Observações</span><strong>{selected.notes}</strong></div>}
 <MapSurface orderToken={selected.tracking_token} destination={selected.destination} destinationLatitude={selected.destination_latitude} destinationLongitude={selected.destination_longitude} status={selected.status} latitude={coords?.lat} longitude={coords?.lng} updatedAt={coords?.at}/>
 <a className="button ghost-button full-width" href={"https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(selected.destination)+"&travelmode=driving"} target="_blank" rel="noreferrer"><Navigation size={16}/> Abrir navegação até o destino</a>
 {next[selected.status]&&<button disabled={busy} className="button main-button full-width" onClick={()=>change(next[selected.status]!.value)}><CheckCircle2 size={16}/>{next[selected.status]!.label}</button>}
 <div className="gps-control"><div className="gps-text"><Radio size={18}/><div><strong>Compartilhar GPS nesta entrega</strong><small>{gps==="on"?"Compartilhando enquanto esta página estiver ativa":gps==="starting"?"Solicitando acesso à localização":gps==="error"?"Falha no compartilhamento":"Desligado. A localização não está sendo enviada."}</small></div></div>{gps==="off"||gps==="error"?<button className="button ghost-button" disabled={selected.status==="preparing"} onClick={start}>Ativar GPS</button>:<button className="button ghost-button" onClick={stop}>Parar GPS</button>}</div>
 <p className="gps-hint">O compartilhamento exige sua permissão e funciona enquanto esta página estiver ativa.</p>
 </>:<div className="aside-empty"><WifiOff size={25}/><strong>Nenhuma entrega selecionada</strong><p>Selecione uma entrega para ver os detalhes.</p></div>}</section></div>}
 </main></div>;
}
