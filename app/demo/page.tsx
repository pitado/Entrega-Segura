"use client";
import {useEffect,useMemo,useState} from "react";
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
 const osm=useMemo(()=>{const delta=.014;const params=new URLSearchParams({bbox:[lng-delta,lat-delta,lng+delta,lat+delta].join(","),layer:"mapnik",marker:lat+","+lng});return "https://www.openstreetmap.org/export/embed.html?"+params.toString();},[lat,lng]);
 const copy=async(v:View)=>{const url=new URL("/demo",window.location.origin);url.searchParams.set("view",v);try{await navigator.clipboard.writeText(url.toString());setCopyFeedback("Link copiado");}catch{setCopyFeedback(url.toString());}setTimeout(()=>setCopyFeedback(""),4500);};
 const switchView=(v:View)=>{setView(v);window.history.replaceState(null,"","/demo?view="+v);};
 return <div className="shell"><header className="topbar"><Link href="/" className="wordmark"><span className="wordmark-symbol">ES</span><span>Entrega Segura<small>Laboratório do MVP</small></span></Link><span className="version-pill">SIMULAÇÃO</span></header>
 <main className="app-content demo-content">
 <div className="page-title"><div><span className="overline">MODO DE TESTE / SEM DADOS REAIS</span><h1>Viagem de demonstração</h1><p>Teste o ciclo completo de uma entrega. As posições são fictícias e o estado fica salvo neste navegador.</p></div><button className="button ghost-button" onClick={()=>{setDemo(newDemo());setCopyFeedback("Simulação reiniciada");}}><RefreshCw size={16}/> Reiniciar</button></div>
 <div className="notice"><strong>Quer testar com links em outros celulares?</strong> O laboratório conectado usa o Neon para sincronizar os três painéis. Exige a configuração de DATABASE_URL no Worker. <Link href="/laboratorio" className="button ghost-button" style={{marginLeft:12}}>Abrir laboratório conectado</Link></div>
 <nav className="demo-nav" aria-label="Selecionar papel"><button className={view==="merchant"?"active":""} onClick={()=>switchView("merchant")}><Warehouse size={16}/> Estabelecimento</button><button className={view==="courier"?"active":""} onClick={()=>switchView("courier")}><Truck size={16}/> Entregador</button><button className={view==="customer"?"active":""} onClick={()=>switchView("customer")}><MapPin size={16}/> Consumidor</button></nav>
 <div className="demo-grid"><section className="detail-panel demo-details">
 <div className="section-top"><div><span className="overline">PEDIDO DE TESTE</span><h2>SIM-1042</h2></div><span className={"status-tag status-"+demo.status}>{names[demo.status]}</span></div>
 {view==="merchant"&&<><p>Cadastre os dados fictícios e simule o despacho. Os outros dois painéis acompanham a mesma viagem neste navegador.</p><div className="form-grid"><div><label>Nome do cliente</label><input value={name} onChange={e=>setName(e.target.value)} maxLength={90}/></div><div><label>Entregador</label><input value={courierName} onChange={e=>setCourierName(e.target.value)} maxLength={90}/></div></div><button className="button main-button" onClick={()=>setDemo({...newDemo(),customer:name.trim()||"Cliente teste",courier:courierName.trim()||"Entregador teste"})}>Criar novo pedido teste <ArrowRight size={15}/></button>
 <div className="divider-line"/><div className="details-pair"><span>Cliente</span><strong>{demo.customer}</strong></div><div className="details-pair"><span>Entregador</span><strong>{demo.courier}</strong></div><div className="details-pair"><span>Cliente pronto</span><strong>{demo.ready?"Confirmado":"Aguardando"}</strong></div><div className="details-pair"><span>Posição compartilhada</span><strong>{demo.sharing?"Simulação ativa":"Não"}</strong></div>
 <div className="share-tools"><button className="button ghost-button" onClick={()=>copy("courier")}><Clipboard size={15}/> Link da tela do entregador</button><button className="button ghost-button" onClick={()=>copy("customer")}><Clipboard size={15}/> Link do cliente</button></div></>}
 {view==="courier"&&<><p>Simule uma entrega pelo celular: inicie o trajeto, veja o marcador avançar no mapa e registre chegada e conclusão.</p><div className="details-pair"><span>Pedido</span><strong>{demo.customer}</strong></div><div className="details-pair"><span>Destino</span><strong>{demo.destination}</strong></div><div className="details-pair"><span>Recebimento confirmado</span><strong>{demo.ready?"Cliente pronto":"Ainda não"}</strong></div><div className="action-stack">
 {demo.status==="preparing"&&<button className="button main-button" onClick={()=>move({status:"on_route",sharing:true,step:0})}><Play size={16}/> Iniciar viagem de teste</button>}
 {demo.status==="on_route"&&<><button className="button ghost-button" onClick={()=>move({sharing:!demo.sharing})}>{demo.sharing?<Pause size={16}/>:<Play size={16}/>} {demo.sharing?"Pausar movimento":"Continuar movimento"}</button><button className="button main-button" onClick={()=>move({status:"arrived",sharing:false,step:route.length-1})}><MapPin size={16}/> Cheguei ao destino</button></>}
 {demo.status==="arrived"&&<button className="button main-button" onClick={()=>move({status:"delivered",sharing:false})}><Check size={16}/> Finalizar entrega</button>}
 {demo.status==="delivered"&&<p className="notice">Entrega de teste concluída. Reinicie a viagem para repetir.</p>}</div>
 <div className="info-line"><Shield size={15}/><span>Na entrega real, o GPS só começa após permissão do dispositivo. Aqui o deslocamento é simulado, sem coletar sua localização.</span></div></>}
 {view==="customer"&&<><span className="overline">ACOMPANHAMENTO DO PEDIDO</span><h2 className="tracking-headline">{demo.status==="preparing"?"Estamos preparando o pedido":demo.status==="on_route"?"Sua entrega está a caminho":demo.status==="arrived"?"O entregador chegou":"Seu pedido foi entregue"}</h2><p>Entregador: {demo.courier}. A posição mostrada no mapa é uma simulação.</p><div className="timeline">{(["preparing","on_route","arrived","delivered"] as Status[]).map((s,i)=>{const current=(["preparing","on_route","arrived","delivered"] as Status[]).indexOf(demo.status);return <div key={s} className={"timeline-step "+(i<=current?"complete":"")}><div className="timeline-dot">{i<current?<Check size={12}/>:i+1}</div><div><strong>{names[s]}</strong><small>{i<=current?"Etapa registrada":"Aguardando"}</small></div></div>})}</div>
 <div className="customer-ready"><div><strong>Está pronto para receber?</strong><p>Confirme para que o entregador e o estabelecimento vejam a informação.</p></div><button className="button main-button" disabled={demo.ready||demo.status==="delivered"} onClick={()=>move({ready:true})}>{demo.ready?"Confirmado":"Estou pronto para receber"}</button></div></>}
 </section>
 <section className="demo-map-panel"><div className="map-topline"><div className="map-heading"><Route size={17}/><strong>Trajeto em teste</strong></div><span className="status-tag status-on_route">Posição fictícia</span></div><div className="map-stage demo-map-stage"><iframe title="Mapa de demonstração OpenStreetMap" src={osm} loading="lazy" referrerPolicy="strict-origin-when-cross-origin"/></div><div className="map-bottom"><div className="map-location"><Navigation size={15}/><span>Ponto {demo.step+1} de {route.length} · {demo.sharing?"Movimento em execução":"Parado"}</span></div><span className="map-credit">Mapa: OpenStreetMap</span></div><div className="demo-progress"><div style={{width:((demo.step/(route.length-1))*100)+"%"}}/></div><p className="map-disclaimer">O percurso e a localização são ilustrativos. Ao configurar Google Maps ou Apple MapKit, o acompanhamento real usa o provedor selecionado.</p><div className="share-tools"><a href={"https://www.google.com/maps/search/?api=1&query="+lat+","+lng} target="_blank" rel="noreferrer" className="button ghost-button">Ver ponto no Google Maps</a><a href={"https://maps.apple.com/?ll="+lat+","+lng} target="_blank" rel="noreferrer" className="button ghost-button">Ver ponto no Apple Maps</a></div></section></div>
 {copyFeedback&&<div className="toast-panel" role="status"><Check size={16}/>{copyFeedback}</div>}
 <div className="notice"><strong>Como testar:</strong> entre na aba Entregador e inicie a viagem; depois abra Consumidor para confirmar o recebimento. Pode manter as páginas em abas diferentes do mesmo navegador. Este link de demonstração não sincroniza dados entre aparelhos; links reais usam o backend.</div>
 </main></div>;
}
