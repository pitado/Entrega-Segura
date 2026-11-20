"use client";
import {useEffect,useState} from "react";
import LiveTripMap from "../components/LiveTripMap";
import {BrandArtwork} from "../components/BrandArtwork";
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

 const stepNames=["Confirmado","Coletado","Em rota","Entregue"];
 const statusStep=demo.status==="preparing"?0:demo.status==="on_route"?2:demo.status==="arrived"?2:3;
 const demoPct=demo.status==="preparing"?18:demo.status==="on_route"?Math.min(82,40+Math.round(demo.step/(route.length-1)*42)):demo.status==="arrived"?92:100;
 return <div className="shell es-v3-site es-v3-demo-shell">
  <header className="topbar es-v3-header"><Link href="/" className="wordmark"><span>Entrega Segura<span className="es-v3-brand-dot">.</span></span></Link><div className="es-v3-header-actions"><span className="es-v3-header-live"><span/> Protótipo interativo</span><Link className="es-v3-header-link" href="/laboratorio">Teste conectado <ArrowRight size={15}/></Link></div></header>
  <main className="app-content es-v3-demo-content">
   <div className="es-v3-demo-intro"><div><span className="es-v3-eyebrow"><span className="es-v3-asterisk">✳</span> A ENTREGA EM BOAS MÃOS</span><h1>Um fluxo completo.<br/><em>Três perspectivas.</em></h1><p>Do balcão à porta do cliente. Explore cada etapa do Entrega Segura em uma única experiência.</p></div><button className="es-v3-restart" onClick={()=>{setDemo(newDemo());setCopyFeedback("Simulação reiniciada");}}><RefreshCw size={16}/> Reiniciar demonstração</button></div>
   <nav className="es-v3-role-switch" aria-label="Selecionar perfil da demonstração"><button type="button" aria-current={view==="merchant"?"page":undefined} onClick={()=>switchView("merchant")}><Warehouse size={18}/><span>Estabelecimento</span><small>Gestão</small></button><button type="button" aria-current={view==="courier"?"page":undefined} onClick={()=>switchView("courier")}><Truck size={18}/><span>Entregador</span><small>Na rua</small></button><button type="button" aria-current={view==="customer"?"page":undefined} onClick={()=>switchView("customer")}><MapPin size={18}/><span>Cliente</span><small>Rastreio</small></button></nav>
   <div className="es-v3-demo-layout">
    <div className="es-v3-demo-main">
     <section className={"es-v3-feature-card es-v3-feature-"+view}>
      <div className="es-v3-feature-copy">
       <span className="es-v3-feature-tag">{view==="merchant"?"PAINEL DO ESTABELECIMENTO":view==="courier"?"CENTRAL DO ENTREGADOR":"ACOMPANHAMENTO AO VIVO"}</span>
       {view==="merchant"?<><p className="es-v3-feature-pre">Pedido em destaque</p><h2>Pronto para<br/>o próximo <i>pedido?</i></h2><p>Gerencie a operação e compartilhe o trajeto em poucos toques.</p></>:view==="courier"?<><p className="es-v3-feature-pre">Olá, {demo.courier}!</p><h2>Sua próxima<br/><i>entrega</i> começa aqui.</h2><p>Atualize o status e acompanhe o trajeto de demonstração.</p></>:<><p className="es-v3-feature-pre">Pedido #1042</p><h2>{demo.status==="delivered"?"Chegou!":demo.status==="arrived"?"Seu pedido chegou.":demo.status==="on_route"?"Tá chegando!":"Tudo no caminho certo."}</h2><p>{demo.status==="delivered"?"Entrega concluída com sucesso.":demo.status==="arrived"?"O entregador informou que já está no destino.":demo.status==="on_route"?"O trajeto está em andamento.":"Acompanhe a preparação e a saída do seu pedido."}</p></>}
       <span className="es-v3-feature-status"><span className="es-v3-status-dot"/>{names[demo.status]} <span className="es-v3-feature-status-arrow">↗</span></span>
      </div>
      <div className="es-v3-feature-art"><BrandArtwork/></div>
      <div className="es-v3-sparkle s1">✳</div><div className="es-v3-sparkle s2">✦</div>
     </section>
     <div className="es-v3-mini-metrics">
      <div className="es-v3-mini-metric es-v3-metric-green"><div className="es-v3-mini-icon"><Check size={20}/></div><span>{view==="merchant"?"Etapa atual":view==="courier"?"Pedido":"Progresso"}</span><strong>{view==="merchant"?names[demo.status]:view==="courier"?"#1042":demoPct+"%"}</strong><div className="es-v3-meter"><span style={{width:demoPct+"%"}}/></div></div>
      <div className="es-v3-mini-metric es-v3-metric-orange"><div className="es-v3-mini-icon"><Route size={20}/></div><span>{view==="customer"?"Rastreamento":"Trajeto"}</span><strong>{demo.status==="delivered"?"Finalizado":demo.status==="preparing"?"Aguardando":demo.sharing?"Em movimento":"Disponível"}</strong><small>Simulação de rota</small></div>
      <div className="es-v3-mini-metric es-v3-metric-pink"><div className="es-v3-mini-icon"><Shield size={20}/></div><span>Cliente</span><strong>{demo.ready?"Confirmado":"Aguardando"}</strong><small>{demo.ready?"Pronto para receber":"Confirmação pendente"}</small></div>
     </div>
     {view==="merchant"&&<section className="es-v3-sheet"><div className="es-v3-sheet-heading"><div><span className="es-v3-eyebrow">OPERAÇÃO</span><h3>Novo pedido de teste</h3><p>Escolha quem recebe e quem realiza a entrega.</p></div><div className="es-v3-sheet-icon"><Warehouse size={22}/></div></div><div className="es-v3-form-grid"><div><label htmlFor="es-demo-customer">Nome do cliente</label><input id="es-demo-customer" value={name} onChange={e=>setName(e.target.value)} maxLength={90} placeholder="Nome do cliente"/></div><div><label htmlFor="es-demo-courier">Entregador</label><input id="es-demo-courier" value={courierName} onChange={e=>setCourierName(e.target.value)} maxLength={90} placeholder="Nome do motoboy"/></div></div><button className="es-v3-pill es-v3-pill-dark" onClick={()=>{setDemo({...newDemo(),customer:name.trim()||"Cliente teste",courier:courierName.trim()||"Entregador teste"});setCopyFeedback("Pedido de demonstração criado");}}><span>Criar pedido demonstrativo</span><ArrowRight size={17}/></button><div className="es-v3-share-links"><button onClick={()=>copy("courier")}><Clipboard size={16}/> Copiar link do entregador</button><button onClick={()=>copy("customer")}><Clipboard size={16}/> Copiar link do cliente</button></div></section>}
     {view==="courier"&&<section className="es-v3-sheet"><div className="es-v3-sheet-heading"><div><span className="es-v3-eyebrow">MINHA ENTREGA</span><h3>{demo.customer}</h3><p>{demo.destination}</p></div><span className={"status-tag status-"+demo.status}>{names[demo.status]}</span></div><div className="es-v3-activity-box"><span className="es-v3-activity-icon"><Navigation size={21}/></span><div><strong>{demo.status==="delivered"?"Entrega finalizada":demo.sharing?"Trajeto simulado ativo":"Atualize o trajeto"}</strong><p>{demo.sharing?"A posição fictícia avança enquanto a viagem estiver ativa.":"Nenhuma localização real é coletada nesta demonstração."}</p></div></div><div className="es-v3-action-stack">{demo.status==="preparing"&&<button className="es-v3-pill es-v3-pill-dark" onClick={()=>move({status:"on_route",sharing:true,step:0})}><Play size={17}/> Iniciar viagem simulada <ArrowRight size={17}/></button>}{demo.status==="on_route"&&<><button className="es-v3-pill es-v3-pill-white" onClick={()=>move({sharing:!demo.sharing})}>{demo.sharing?<Pause size={17}/>:<Play size={17}/>} {demo.sharing?"Pausar movimento":"Continuar movimento"}</button><button className="es-v3-pill es-v3-pill-dark" onClick={()=>move({status:"arrived",sharing:false,step:route.length-1})}><MapPin size={17}/> Confirmar chegada</button></>}{demo.status==="arrived"&&<button className="es-v3-pill es-v3-pill-dark" onClick={()=>move({status:"delivered",sharing:false})}><Check size={17}/> Finalizar entrega</button>}{demo.status==="delivered"&&<div className="es-v3-finished"><Check size={18}/> Entrega de teste concluída. Use “Reiniciar demonstração” para repetir.</div>}</div><div className="es-v3-safety-note"><Shield size={17}/> O GPS real depende de permissão no aplicativo operacional; aqui o movimento é ilustrativo.</div></section>}
     {view==="customer"&&<section className="es-v3-sheet"><div className="es-v3-sheet-heading"><div><span className="es-v3-eyebrow">SUA ENTREGA</span><h3>Como está o pedido?</h3><p>Acompanhe a etapa atual sem criar uma conta.</p></div><div className="es-v3-sheet-icon"><MapPin size={22}/></div></div><div className="es-v3-courier-line"><div className="es-v3-avatar">{demo.courier.charAt(0).toUpperCase()}</div><div><strong>{demo.courier}</strong><small>Entregador do pedido #1042</small></div><span className="es-v3-trust-chip"><Shield size={13}/> Informação demonstrativa</span></div><div className="es-v3-ready-box"><div><strong>Pronto para receber?</strong><p>Avise ao entregador que você já pode receber a encomenda.</p></div><button className="es-v3-pill es-v3-pill-dark" disabled={demo.ready||demo.status==="delivered"} onClick={()=>move({ready:true})}>{demo.ready?<><Check size={16}/> Confirmado</>:<><Check size={16}/> Estou pronto</>}</button></div></section>}
    </div>
    <aside className="es-v3-demo-side">
      <section className="es-v3-side-map"><div className="es-v3-side-heading"><div><span className="es-v3-eyebrow">NO MAPA</span><h3>Onde está o pedido?</h3></div><span className="es-v3-map-chip"><span/> Percurso fictício</span></div><LiveTripMap origin={{lat,lng}} destination={demoRoute[demoRoute.length-1]} routePoints={demoRoute} simulated status={demo.status} updatedAt={demo.updatedAt}/></section>
      <section className="es-v3-progress-sheet"><div className="es-v3-side-heading"><div><span className="es-v3-eyebrow">ATUALIZAÇÕES</span><h3>Etapas da entrega</h3></div><span className="es-v3-progress-number">{demoPct}%</span></div><div className="es-v3-progress-track"><div style={{width:demoPct+"%"}}/></div><div className="es-v3-steps">{stepNames.map((label,i)=><div key={label} className={"es-v3-step "+(i<=statusStep?"is-done":"")}><span className="es-v3-step-dot">{i<statusStep?<Check size={13}/>:i+1}</span><span>{label}</span></div>)}</div><div className="es-v3-order-details"><div><span>Pedido</span><strong>#1042</strong></div><div><span>Cliente</span><strong>{demo.customer}</strong></div><div><span>Entregador</span><strong>{demo.courier}</strong></div><div><span>Pronto para receber</span><strong>{demo.ready?"Sim":"Ainda não"}</strong></div></div></section>
    </aside>
   </div>
   <div className="es-v3-demo-footer"><div><Shield size={17}/><span>Demonstração com dados fictícios, salva somente neste navegador. Nenhum GPS real é coletado.</span></div><Link href="/laboratorio">Testar em celulares diferentes <ArrowRight size={16}/></Link></div>
   {copyFeedback&&<div className="toast-panel" role="status"><Check size={16}/>{copyFeedback}</div>}
  </main>
 </div>;
}
