"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import DeliveryMap,{Point,RouteLinks} from "./delivery-map";
import "../lab.css";
type Order={id:string;customer_name:string;destination:string;status:string;customer_ready:boolean;
  destination_latitude:number|null;destination_longitude:number|null;latitude:number|null;longitude:number|null;location_updated_at:string|null;location_source:string|null;courier_name:string;};
const route:Point[]=[
  {lat:-23.4266,lng:-51.9500},{lat:-23.4250,lng:-51.9462},{lat:-23.4235,lng:-51.9420},
  {lat:-23.4212,lng:-51.9392},{lat:-23.4210,lng:-51.9330}
];
const statuses:Record<string,string>={preparing:"Aguardando saída",on_route:"Em rota",arrived:"No destino",delivered:"Entregue",cancelled:"Cancelado"};
const point=(lat:number|null,lng:number|null)=>lat!=null&&lng!=null?{lat,lng}:null;
export default function CourierConsole({token}:{token:string}){
  const [order,setOrder]=useState<Order|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [mode,setMode]=useState<"off"|"gps"|"simulation">("off");
  const [step,setStep]=useState(0);
  const [lastSent,setLastSent]=useState("");
  const watch=useRef<number|null>(null);
  const timer=useRef<number|null>(null);
  const throttle=useRef(0);
  const simulation=useRef(0);
  const request=useCallback(async(action:Record<string,unknown>)=>{
    const r=await fetch(`/api/demo/courier/${token}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(action)});
    const data=await r.json();
    if(!r.ok)throw new Error(data.error||"Não foi possível atualizar a entrega.");
    return data;
  },[token]);
  const reload=useCallback(async()=>{
    try{const r=await fetch(`/api/demo/courier/${token}`,{cache:"no-store"});const data=await r.json();if(!r.ok)throw new Error(data.error||"Link inválido.");setOrder(data);}catch(e){setError(e instanceof Error?e.message:"Falha de conexão.");}
  },[token]);
  useEffect(()=>{void reload();const id=window.setInterval(()=>void reload(),5000);return()=>window.clearInterval(id);},[reload]);
  function stop(){
    if(watch.current!==null){navigator.geolocation.clearWatch(watch.current);watch.current=null;}
    if(timer.current!==null){window.clearInterval(timer.current);timer.current=null;}
    setMode("off");
  }
  useEffect(()=>()=>{if(watch.current!==null)navigator.geolocation.clearWatch(watch.current);if(timer.current!==null)window.clearInterval(timer.current);},[]);
  async function status(next:string){
    setBusy(true);setError("");
    try{await request({action:"status",status:next});if(next==="delivered")stop();await reload();}
    catch(e){setError(e instanceof Error?e.message:"Falha ao mudar status.");}
    finally{setBusy(false);}
  }
  async function ensureRoute(){
    if(order?.status==="preparing"){await request({action:"status",status:"on_route"});await reload();}
  }
  async function gps(){
    if(!navigator.geolocation){setError("Este navegador não oferece geolocalização.");return;}
    if(mode!=="off")stop();
    setError("");
    try{
      await ensureRoute();
      setMode("gps");throttle.current=0;
      watch.current=navigator.geolocation.watchPosition(async p=>{
        if(Date.now()-throttle.current<4500)return;
        throttle.current=Date.now();
        try{
          await request({action:"position",source:"gps",latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy});
          setLastSent(new Date().toLocaleTimeString("pt-BR"));void reload();
        }catch(e){setError(e instanceof Error?e.message:"Não foi possível enviar localização.");}
      },e=>{setError("A localização foi negada ou está indisponível: "+e.message);stop();},
      {enableHighAccuracy:true,maximumAge:0,timeout:20000});
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível iniciar GPS.");setMode("off");}
  }
  async function demo(){
    if(mode!=="off")stop();
    setBusy(true);setError("");
    try{
      await ensureRoute();
      setMode("simulation");simulation.current=0;setStep(0);
      const advance=async()=>{
        const index=simulation.current;
        if(index>=route.length){
          if(timer.current!==null)window.clearInterval(timer.current);
          timer.current=null;setMode("off");
          try{await request({action:"status",status:"arrived"});await reload();}
          catch(e){setError(e instanceof Error?e.message:"Não foi possível atualizar a chegada.");}
          return;
        }
        simulation.current+=1;setStep(simulation.current);
        try{await request({action:"position",source:"simulation",latitude:route[index].lat,longitude:route[index].lng,accuracy:8});
          setLastSent(new Date().toLocaleTimeString("pt-BR"));void reload();}
        catch(e){setError(e instanceof Error?e.message:"Não foi possível enviar a posição simulada.");stop();}
      };
      await advance();
      timer.current=window.setInterval(()=>void advance(),4000);
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível iniciar o trajeto.");setMode("off");}
    finally{setBusy(false);}
  }
  const active=order&&["preparing","on_route","arrived"].includes(order.status);
  const dest=order?point(order.destination_latitude,order.destination_longitude):null;
  const loc=order?point(order.latitude,order.longitude):null;
  return <div className="shell lab-driver"><header className="topbar"><a className="identity" href="/"><strong>Entrega Segura</strong></a></header>
    <div className="workspace-title"><h1>Minha entrega</h1></div>
    {error&&<div className="notice error" role="alert">{error}</div>}
    {!order?<div className="setup-panel"><p>Carregando o pedido ou verificando acesso...</p></div>:
    <div className="driver-grid"><main className="driver-info"><section className="data-panel padding-panel"><div className="delivery-title"><span className="status-pill">{statuses[order.status]||order.status}</span><span className="muted tiny">Pedido #{order.id.slice(0,8).toUpperCase()}</span></div>
      <h2>{order.destination}</h2><p className="muted">Cliente: {order.customer_name}</p><div className="info-grid"><div><small>Recebimento</small><strong>{order.customer_ready?"Cliente confirmou que está pronto":"Confirmação pendente"}</strong></div><div><small>Compartilhamento</small><strong>{mode==="gps"?"GPS ativo":mode==="simulation"?"Simulação ativa":"Desligado"}</strong></div></div>
      <div className="actions"><h3>Etapa da viagem</h3>{order.status==="preparing"&&<button disabled={busy} className="button primary" onClick={()=>void status("on_route")}>Saiu para entrega</button>}{order.status==="on_route"&&<button disabled={busy} className="button primary" onClick={()=>void status("arrived")}>Cheguei ao destino</button>}{order.status==="arrived"&&<button disabled={busy} className="button primary" onClick={()=>void status("delivered")}>Confirmar entrega concluída</button>}{order.status==="delivered"&&<p className="notice success">Entrega concluída. O compartilhamento de posição foi encerrado.</p>}</div>
      </section>
      {active&&<section className="data-panel padding-panel"><h3>Localização</h3>
        <div className="action-stack"><button className="button primary" onClick={()=>void gps()} disabled={busy||mode==="gps"}>Compartilhar meu GPS</button><button className="button outline" onClick={()=>void demo()} disabled={busy||mode==="simulation"}>Simular uma viagem de teste</button>{mode!=="off"&&<button className="button tertiary" onClick={stop}>Parar compartilhamento</button>}</div>
        {mode==="simulation"&&<p className="notice info">Viagem fictícia em execução: ponto {Math.min(step,route.length)} de {route.length}. Não é uma rota calculada pelas ruas.</p>}
        <p className="muted tiny">O GPS funciona apenas enquanto o navegador mantém a página ativa. Último envio: {lastSent||"nenhum"}.</p>
      </section>}
      <section className="data-panel padding-panel"><h3>Navegar até o destino</h3><p className="muted">{order.destination}</p><RouteLinks destination={dest} address={order.destination}/></section>
    </main><aside><DeliveryMap orderToken={token} courier={loc} destination={dest} address={order.destination} source={mode==="simulation"?"simulation":order.location_source} updatedAt={order.location_updated_at}/><section className="data-panel padding-panel"><h3>Acompanhamento</h3><p className="muted">Sua posição aparece no painel e no link do cliente enquanto o compartilhamento estiver ativo.</p></section></aside></div>}
    </div>;
}
