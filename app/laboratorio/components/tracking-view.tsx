"use client";
import { useCallback, useEffect, useState } from "react";
import DeliveryMap, { Point } from "./delivery-map";
import "../lab.css";
type Tracking={id:string;status:string;customer_ready:boolean;customer_ready_at:string|null;
  courier_name:string|null;destination:string;destination_latitude:number|null;destination_longitude:number|null;
  latitude:number|null;longitude:number|null;location_updated_at:string|null;location_source:string|null;created_at:string;delivered_at:string|null};
const steps=[{code:"preparing",title:"Em preparação"},{code:"on_route",title:"Saiu para entrega"},{code:"arrived",title:"Entregador chegou"},{code:"delivered",title:"Entrega concluída"}];
const pos=(lat:number|null,lng:number|null):Point|null=>lat!==null&&lng!==null?{lat,lng}:null;
export default function TrackingView({token}:{token:string}){
  const [data,setData]=useState<Tracking|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [last,setLast]=useState("");
  const load=useCallback(async()=>{
    try{
      const r=await fetch(`/api/demo/tracking/${token}`,{cache:"no-store"});
      const x=await r.json();
      if(!r.ok)throw new Error(x.error||"Não foi possível carregar o acompanhamento.");
      setData(x);setLast(new Date().toLocaleTimeString("pt-BR"));setError("");
    }catch(e){setError(e instanceof Error?e.message:"Falha de conexão.");}
  },[token]);
  useEffect(()=>{void load();const id=window.setInterval(()=>void load(),5000);return()=>window.clearInterval(id)},[load]);
  async function post(body:Record<string,unknown>){
    setBusy(true);setError("");
    try{
      const r=await fetch(`/api/demo/tracking/${token}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const x=await r.json();if(!r.ok)throw new Error(x.error||"Falha ao confirmar.");await load();
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível confirmar.");}
    finally{setBusy(false);}
  }
  function shareLocation(){
    if(!navigator.geolocation){setError("Seu aparelho não oferece localização.");return;}
    setBusy(true);setError("");
    navigator.geolocation.getCurrentPosition(
      async p=>{await post({action:"destination",latitude:p.coords.latitude,longitude:p.coords.longitude});setBusy(false);},
      e=>{setBusy(false);setError("Não foi possível obter sua localização: "+e.message);},
      {enableHighAccuracy:true,timeout:20000,maximumAge:0}
    );
  }
  const stage=steps.findIndex(s=>s.code===data?.status);
  return <div className="shell lab-customer">
    <header className="topbar"><a className="identity" href="/"><strong>Entrega Segura</strong></a></header>
    <div className="workspace-title"><h1>Sua entrega</h1></div>
    {error&&<div className="notice error" role="alert">{error}</div>}
    {data?<div className="tracking-grid"><section className="tracking-main"><DeliveryMap courier={pos(data.latitude,data.longitude)} destination={pos(data.destination_latitude,data.destination_longitude)} address={data.destination} source={data.location_source} updatedAt={data.location_updated_at}/>
      <div className="tracking-update"><span className="live-dot"/> {data.location_updated_at?"Motoboy localizado · ":data.status==="on_route"?"Aguardando sinal · ":"Última consulta · "} {last||"—"}</div>
      {data.status==="on_route"&&!data.latitude&&<div className="notice info">O entregador está em rota, mas ainda não compartilhou uma posição recente.</div>}
      {data.status==="delivered"&&<div className="notice success">Pedido entregue. O rastreamento de localização foi encerrado.</div>}
    </section>
    <aside className="data-panel tracking-details"><div className="tracking-heading"><h2>{steps[stage]?.title||"Acompanhamento"}</h2><p className="muted">{data.destination}</p>{data.courier_name&&<p className="muted">Entregador: {data.courier_name}</p>}</div>
      <ol className="timeline">{steps.map((s,i)=><li key={s.code} className={i<=stage?"done":""}><span className="timeline-point"/><div><strong>{s.title}</strong><small>{i<stage?"Concluído":i===stage?"Em andamento":"Aguardando"}</small></div></li>)}</ol>
      {!["delivered","cancelled"].includes(data.status)&&<div className="ready-card"><strong>Você estará pronto para receber?</strong><p className="muted">Informe ao entregador que pode receber o pedido assim que ele chegar.</p>
        <button className="button primary full" disabled={busy||data.customer_ready} onClick={()=>void post({action:"ready"})}>{data.customer_ready?"Recebimento pronto confirmado":"Estou pronto para receber"}</button>
        <div className="separator"/>
        <strong>Confirmar meu ponto de entrega</strong><p className="muted tiny">Opcional. Compartilha sua posição atual apenas para este pedido, após permissão do navegador.</p>
        <button className="button outline full" disabled={busy} onClick={shareLocation}>Usar minha localização como destino</button>
      </div>}
      
    </aside></div>:<div className="setup-panel">Carregando acompanhamento do pedido...</div>}
    
  </div>;
}
