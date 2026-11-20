"use client";
import {useEffect,useState} from "react";
import LiveTripMap from "../components/LiveTripMap";
import {EditorialArt} from "../components/EditorialArt";
import Link from "next/link";
import {ArrowRight,Check,Clipboard,MapPin,Navigation,Pause,Play,RefreshCw,Route,Shield,Truck,Warehouse} from "lucide-react";
type Status="preparing"|"on_route"|"arrived"|"delivered";
type View="merchant"|"courier"|"customer";
type Demo={customer:string;destination:string;courier:string;status:Status;ready:boolean;sharing:boolean;step:number;updatedAt:string};
const STORAGE="entrega-segura-test-trip-v2";
const route=[
 [-23.42690,-51.93566],[-23.42635,-51.93502],[-23.42575,-51.93420],[-23.42513,-51.93347],
 [-23.42458,-51.93272],[-23.42396,-51.93205],[-23.42340,-51.93125],[-23.42281,-51.93054],
 [-23.42218,-51.92980],[-23.42154,-51.92915],[-23.42083,-51.92850],[-23.42018,-51.92776]
];
const demoRoute=route.map(([lat,lng])=>({lat,lng}));
const newDemo=():Demo=>({customer:"Ana Costa",destination:"Região central, Maringá - PR (destino ilustrativo)",courier:"Lucas",status:"preparing",ready:false,sharing:false,step:0,updatedAt:new Date().toISOString()});
const names:Record<Status,string>={preparing:"Em preparo",on_route:"Em rota",arrived:"No destino",delivered:"Entregue"};
function safe(v:unknown):Demo{
 const original=newDemo();
 if(!v||typeof v!=="object")return original;
 const x=v as Partial<Demo>;
 if(!["preparing","on_route","arrived","delivered"].includes(String(x.status)))return original;
 return {...original,
  customer:typeof x.customer==="string"?x.customer.slice(0,90):original.customer,
  courier:typeof x.courier==="string"?x.courier.slice(0,90):original.courier,
  destination:typeof x.destination==="string"?x.destination.slice(0,160):original.destination,
  status:x.status!,ready:Boolean(x.ready),sharing:Boolean(x.sharing),step:Math.min(route.length-1,Math.max(0,Number(x.step)||0)),
  updatedAt:typeof x.updatedAt==="string"?x.updatedAt:original.updatedAt};
}
export default function DemoPage(){
 const [ready,setReady]=useState(false);
 const [demo,setDemo]=useState<Demo>(newDemo);
 const [view,setView]=useState<View>("merchant");
 const [copyFeedback,setCopyFeedback]=useState("");
 const [name,setName]=useState("Ana Costa"),[courierName,setCourierName]=useState("Lucas");
 useEffect(()=>{
  const query=new URLSearchParams(window.location.search).get("view");
  if(query==="merchant"||query==="courier"||query==="customer")setView(query);
  try{const saved=localStorage.getItem(STORAGE);if(saved)setDemo(safe(JSON.parse(saved)))}catch{}
  setReady(true);
  const onStorage=(event:StorageEvent)=>{if(event.key===STORAGE&&event.newValue){try{const incoming=safe(JSON.parse(event.newValue));setDemo(current=>JSON.stringify(current)===JSON.stringify(incoming)?current:incoming)}catch{}}};
  window.addEventListener("storage",onStorage);
  return()=>window.removeEventListener("storage",onStorage);
 },[]);
 useEffect(()=>{if(ready)localStorage.setItem(STORAGE,JSON.stringify(demo));},[demo,ready]);
 useEffect(()=>{
  if(!ready||!demo.sharing||demo.status!=="on_route")return;
  const timer=setInterval(()=>setDemo(s=>{
    if(!s.sharing||s.status!=="on_route"||s.step>=route.length-1)return {...s,sharing:false};
    return {...s,step:s.step+1,updatedAt:new Date().toISOString()};
  }),3000);
  return()=>clearInterval(timer);
 },[ready,demo.status,demo.sharing]);
 const move=(patch:Partial<Demo>)=>setDemo(d=>({...d,...patch,updatedAt:new Date().toISOString()}));
 const point=route[demo.step],lat=point[0],lng=point[1];
 const copy=async(v:View)=>{const url=new URL("/demo",window.location.origin);url.searchParams.set("view",v);try{await navigator.clipboard.writeText(url.toString());setCopyFeedback("Link copiado");}catch{setCopyFeedback(url.toString());}setTimeout(()=>setCopyFeedback(""),4500);};
 const switchView=(v:View)=>{setView(v);window.history.replaceState(null,"","/demo?view="+v);};


 const pct=demo.status==="preparing"?15:demo.status==="on_route"?Math.min(85,35+Math.round(demo.step/(route.length-1)*50)):demo.status==="arrived"?92:100;
 const steps=["Pedido confirmado","Saiu para entrega","Chegou ao destino","Entregue"];
 const activeStep=demo.status==="preparing"?0:demo.status==="on_route"?1:demo.status==="arrived"?2:3;
 return <div className="es4-site">
  <header className="es4-topbar"><Link href="/" className="es4-wordmark"><span className="es4-brand-icon"><Route size={20}/></span><span>Entrega<span className="es4-word-break">Segura</span><b>.</b></span></Link><div className="es4-top-actions"><span className="es4-demo-caption"><span/> Modo de demonstração</span><Link href="/laboratorio" className="es4-pill es4-top-link">Teste entre celulares <ArrowRight size={15}/></Link></div></header>
  <main className="es4-workspace">
   <aside className="es4-sidebar"><div className="es4-sidebar-top"><span className="es4-side-eyebrow">SUA VISÃO</span><h2>Escolha<br/>seu perfil<span>.</span></h2></div><nav aria-label="Perfis da demonstração" className="es4-persona-nav"><button className={view==="merchant"?"active":""} onClick={()=>switchView("merchant")} aria-current={view==="merchant"?"page":undefined}><Warehouse size={21}/><span>Estabelecimento<small>Gerenciar pedidos</small></span><ArrowRight size={16}/></button><button className={view==="courier"?"active":""} onClick={()=>switchView("courier")} aria-current={view==="courier"?"page":undefined}><Truck size={21}/><span>Entregador<small>A caminho</small></span><ArrowRight size={16}/></button><button className={view==="customer"?"active":""} onClick={()=>switchView("customer")} aria-current={view==="customer"?"page":undefined}><MapPin size={21}/><span>Cliente<small>Meu pedido</small></span><ArrowRight size={16}/></button></nav><div className="es4-sidebar-bottom"><span className="es4-spark">✳</span><p>Uma entrega.<br/><strong>Todo mundo conectado.</strong></p><button onClick={()=>{setDemo(newDemo());setCopyFeedback("Demonstração reiniciada");}}><RefreshCw size={16}/> Reiniciar</button></div></aside>
   <div className="es4-main">
    <div className="es4-heading"><div><span className="es4-kicker">{view==="merchant"?"01 / PAINEL DO ESTABELECIMENTO":view==="courier"?"02 / CENTRAL DO ENTREGADOR":"03 / ACOMPANHAMENTO"}</span><h1>{view==="merchant"?"Seu balcão, mais leve.":view==="courier"?"Tudo pronto pra sair.":"Seu pedido, pertinho."}</h1><p>{view==="merchant"?"Pedidos, entregador e cliente no mesmo fluxo.":view==="courier"?"Informação certa na hora de fazer a entrega.":"Cada etapa do caminho, sem complicação."}</p></div><button className="es4-quiet-button" onClick={()=>{setDemo(newDemo());setCopyFeedback("Demonstração reiniciada");}}><RefreshCw size={16}/><span>Reiniciar teste</span></button></div>
    {view==="merchant"&&<>
     <div className="es4-lead-grid">
      <section className="es4-hero es4-hero-shop"><div className="es4-hero-content"><span className="es4-pill es4-white-label"><span className="es4-live-dot"/> PEDIDOS DO DIA</span><h2><span className="es4-jumbo">01</span><small>pedido em acompanhamento</small></h2><p>Organize a operação com uma visão clara e colorida.</p><a href="#es4-order-form" className="es4-pill es4-black-pill">Novo pedido <ArrowRight size={17}/></a></div><EditorialArt variant="parcel" className="es4-art es4-art-shop"/><span aria-hidden="true" className="es4-hero-deco">✳</span></section>
      <section className="es4-spotlight"><span className="es4-spot-eyebrow">PEDIDO #1042 <span>✦</span></span><h3>{demo.customer}</h3><p>{demo.destination}</p><span className="es4-status-light">{names[demo.status]}</span><div className="es4-spot-bottom"><div><small>ENTREGADOR</small><strong>{demo.courier}</strong></div><span className="es4-spot-symbol"><Route size={27}/></span></div></section>
     </div>
     <section className="es4-metrics"><div className="es4-metric mint"><div className="es4-metric-top"><Check size={20}/><span>01</span></div><small>Etapa atual</small><strong>{names[demo.status]}</strong></div><div className="es4-metric orange"><div className="es4-metric-top"><Truck size={20}/><span>02</span></div><small>Trajeto</small><strong>{demo.sharing?"Em movimento":demo.status==="delivered"?"Finalizado":"Aguardando"}</strong></div><div className="es4-metric pink"><div className="es4-metric-top"><Shield size={20}/><span>03</span></div><small>Cliente</small><strong>{demo.ready?"Pronto para receber":"Aguardando"}</strong></div></section>
     <section className="es4-paper es4-order-form" id="es4-order-form"><div className="es4-section-heading"><div><span className="es4-kicker">GESTÃO RÁPIDA</span><h3>Criar um pedido</h3><p>Atualize os dados deste pedido de demonstração.</p></div><div className="es4-section-symbol"><Warehouse size={22}/></div></div><div className="es4-fields"><div><label htmlFor="es4-customer-name">Cliente</label><input id="es4-customer-name" value={name} maxLength={90} onChange={e=>setName(e.target.value)}/></div><div><label htmlFor="es4-courier-name">Entregador</label><input id="es4-courier-name" value={courierName} maxLength={90} onChange={e=>setCourierName(e.target.value)}/></div></div><div className="es4-order-actions"><button className="es4-pill es4-black-pill" onClick={()=>{setDemo({...newDemo(),customer:name.trim()||"Cliente teste",courier:courierName.trim()||"Entregador teste"});setCopyFeedback("Pedido demonstrativo criado");}}>Criar pedido <ArrowRight size={16}/></button><button className="es4-pill es4-outline-pill" onClick={()=>copy("courier")}><Clipboard size={15}/> Link do entregador</button><button className="es4-pill es4-outline-pill" onClick={()=>copy("customer")}><Clipboard size={15}/> Link do cliente</button></div></section>
    </>}
    {view==="courier"&&<>
     <div className="es4-lead-grid">
      <section className="es4-hero es4-hero-rider"><div className="es4-hero-content"><span className="es4-pill es4-white-label">OLÁ, {demo.courier.toUpperCase()} ✳</span><h2><span className="es4-jumbo">01</span><small>entrega na sua lista</small></h2><p>Seu próximo destino fica logo ali.</p><a href="#es4-rider-actions" className="es4-pill es4-black-pill">Ver minha rota <ArrowRight size={16}/></a></div><EditorialArt variant="courier" className="es4-art es4-art-rider"/></section>
      <section className="es4-spotlight"><span className="es4-spot-eyebrow">ENTREGA ATUAL</span><h3>{demo.customer}</h3><p>{demo.destination}</p><span className="es4-status-light">{names[demo.status]}</span><div className="es4-spot-bottom"><div><small>DESTINO</small><strong>Pedido #1042</strong></div><span className="es4-spot-symbol"><Navigation size={26}/></span></div></section>
     </div>
     <section className="es4-metrics"><div className="es4-metric mint"><div className="es4-metric-top"><Check size={20}/><span>01</span></div><small>Cliente</small><strong>{demo.ready?"Confirmado":"Aguardando"}</strong></div><div className="es4-metric pink"><div className="es4-metric-top"><MapPin size={20}/><span>02</span></div><small>Rota</small><strong>{demo.status==="delivered"?"Finalizada":demo.sharing?"Ativa":"A iniciar"}</strong></div><div className="es4-metric orange"><div className="es4-metric-top"><Route size={20}/><span>03</span></div><small>Progresso</small><strong>{pct}%</strong></div></section>
     <section className="es4-paper" id="es4-rider-actions"><div className="es4-section-heading"><div><span className="es4-kicker">PRÓXIMO PASSO</span><h3>Atualizar entrega</h3><p>Os botões avançam o fluxo fictício e atualizam as outras telas.</p></div><div className="es4-section-symbol"><Truck size={22}/></div></div><div className="es4-order-actions">
      {demo.status==="preparing"&&<button className="es4-pill es4-black-pill" onClick={()=>move({status:"on_route",sharing:true,step:0})}><Play size={17}/> Iniciar viagem simulada <ArrowRight size={17}/></button>}
      {demo.status==="on_route"&&<><button className="es4-pill es4-outline-pill" onClick={()=>move({sharing:!demo.sharing})}>{demo.sharing?<Pause size={17}/>:<Play size={17}/>} {demo.sharing?"Pausar trajeto":"Continuar trajeto"}</button><button className="es4-pill es4-black-pill" onClick={()=>move({status:"arrived",sharing:false,step:route.length-1})}><MapPin size={17}/> Cheguei ao destino</button></>}
      {demo.status==="arrived"&&<button className="es4-pill es4-black-pill" onClick={()=>move({status:"delivered",sharing:false})}><Check size={17}/> Confirmar entrega concluída</button>}
      {demo.status==="delivered"&&<p className="es4-success-msg"><Check size={18}/> Entrega concluída. Reinicie para repetir o fluxo.</p>}
     </div></section>
    </>}
    {view==="customer"&&<>
     <div className="es4-lead-grid es4-customer-lead">
      <section className="es4-hero es4-hero-customer"><div className="es4-hero-content"><span className="es4-pill es4-white-label">PEDIDO #1042</span><h2 className="es4-customer-headline">{demo.status==="delivered"?"Entregue.":demo.status==="arrived"?"Já chegou!":demo.status==="on_route"?"Tá chegando.":"Tudo em andamento."}</h2><p>{demo.status==="preparing"?"Estamos preparando o seu pedido.":demo.status==="on_route"?"Seu entregador está a caminho.":demo.status==="arrived"?"O entregador chegou ao destino.":"A entrega foi finalizada."}</p><span className="es4-pill es4-black-pill es4-static-pill">{names[demo.status]} <ArrowRight size={16}/></span></div><EditorialArt variant="tracking" className="es4-art es4-art-track"/></section>
      <section className="es4-spotlight es4-customer-spot"><span className="es4-spot-eyebrow">QUEM ESTÁ ENTREGANDO</span><div className="es4-rider-avatar">{demo.courier.slice(0,1).toUpperCase()}</div><h3>{demo.courier}</h3><p>Entregador do pedido #1042</p><span className="es4-status-light">{demo.ready?"Você confirmou que está pronto":"Aguardando confirmação"}</span><div className="es4-spot-bottom"><div><small>RASTREAMENTO</small><strong>Simulação</strong></div><span className="es4-spot-symbol"><Shield size={26}/></span></div></section>
     </div>
     <section className="es4-metrics"><div className="es4-metric mint"><div className="es4-metric-top"><Check size={20}/><span>01</span></div><small>Pedido</small><strong>{names[demo.status]}</strong></div><div className="es4-metric orange"><div className="es4-metric-top"><Route size={20}/><span>02</span></div><small>Progresso</small><strong>{pct}%</strong></div><div className="es4-metric pink"><div className="es4-metric-top"><MapPin size={20}/><span>03</span></div><small>Localização</small><strong>Fictícia</strong></div></section>
     <section className="es4-paper es4-ready-panel"><div className="es4-section-heading"><div><span className="es4-kicker">SUA VEZ</span><h3>Pronto para receber?</h3><p>Avise ao estabelecimento e ao entregador na demonstração.</p></div><div className="es4-section-symbol"><Check size={22}/></div></div><button className="es4-pill es4-black-pill" disabled={demo.ready||demo.status==="delivered"} onClick={()=>move({ready:true})}>{demo.ready?<><Check size={17}/> Pronto confirmado</>:<><Check size={17}/> Estou pronto para receber</>}</button></section>
    </>}
    <section className="es4-paper es4-route-panel"><div className="es4-section-heading"><div><span className="es4-kicker">RASTREAMENTO</span><h3>Mapa e andamento</h3><p>Trajeto ilustrativo, sem localização real.</p></div><span className="es4-route-badge"><span/> Simulado</span></div><div className="es4-map-frame"><LiveTripMap origin={{lat,lng}} destination={demoRoute[demoRoute.length-1]} routePoints={demoRoute} simulated status={demo.status} updatedAt={demo.updatedAt}/></div><div className="es4-route-progress"><div className="es4-route-progress-line"><span style={{width:pct+"%"}}/></div><div className="es4-route-step"><span>{pct}% do fluxo</span><strong>{names[demo.status]}</strong></div></div><div className="es4-step-list">{steps.map((label,i)=><div key={label} className={i<=activeStep?"active":""}><span>{i<activeStep?<Check size={13}/>:i+1}</span><small>{label}</small></div>)}</div></section>
    <footer className="es4-footnote"><Shield size={16}/> Experiência demonstrativa com dados fictícios salvos neste navegador. Para acompanhar em mais de um aparelho, <Link href="/laboratorio">use o teste conectado</Link>.</footer>
   </div>
  </main>
  <div className="es4-mobile-tabs" role="navigation" aria-label="Trocar perfil"><button aria-current={view==="merchant"?"page":undefined} onClick={()=>switchView("merchant")}><Warehouse size={20}/><span>Loja</span></button><button aria-current={view==="courier"?"page":undefined} onClick={()=>switchView("courier")}><Truck size={20}/><span>Entregador</span></button><button aria-current={view==="customer"?"page":undefined} onClick={()=>switchView("customer")}><MapPin size={20}/><span>Cliente</span></button></div>
  {copyFeedback&&<div className="toast-panel" role="status"><Check size={16}/>{copyFeedback}</div>}
 </div>;
}
