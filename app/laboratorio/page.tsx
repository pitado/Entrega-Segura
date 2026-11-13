"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {ArrowRight,Check,Clipboard,Plus,RefreshCw,Route,Truck,Warehouse} from "lucide-react";
import MapSurface from "../components/MapSurface";
import "./lab.css";
type Courier={id:string;name:string;active:boolean};
type Order={id:string;customer_name:string;destination:string;status:string;customer_ready:boolean;tracking_token:string;courier_access_token:string;courier_id:string;courier_name:string;created_at:string;destination_latitude:number|null;destination_longitude:number|null;latitude:number|null;longitude:number|null;location_source:string|null;location_updated_at:string|null};
type Data={session:{expires_at:string};couriers:Courier[];orders:Order[]};
const names:Record<string,string>={preparing:"Em preparo",on_route:"Em rota",arrived:"No destino",delivered:"Entregue",cancelled:"Cancelado"};
const url=(kind:"courier"|"client",o:Order)=>`/laboratorio/${kind==="courier"?"entregador":"acompanhar"}/${kind==="courier"?o.courier_access_token:o.tracking_token}`;
export default function Lab(){
 const [token,setToken]=useState("");
 const [data,setData]=useState<Data|null>(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(false);
 const [selected,setSelected]=useState("");
 const [newCustomer,setNewCustomer]=useState("Cliente teste");
 const [address,setAddress]=useState("Centro, Maringá - PR");
 const [courierName,setCourierName]=useState("");
 const [copied,setCopied]=useState("");
 const refresh=useCallback(async(v:string,silent=false)=>{
   try{
     const res=await fetch("/api/demo",{headers:{Authorization:`Bearer ${v}`},cache:"no-store"});
     const body=await res.json();
     if(!res.ok)throw Error(body.error||"Falha ao consultar o Neon.");
     setData(body);
     if(!silent)setError("");
   }catch(e){if(!silent)setError((e as Error).message);}
 },[]);
 useEffect(()=>{const saved=localStorage.getItem("entrega-lab-token");if(saved){setToken(saved);void refresh(saved);} },[refresh]);
 useEffect(()=>{if(!token)return;const i=setInterval(()=>void refresh(token,true),5000);return()=>clearInterval(i);},[token,refresh]);
 async function start(){
   setLoading(true);setError("");
   try{
     const res=await fetch("/api/demo",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"start"})});
     const body=await res.json();if(!res.ok)throw Error(body.error||"Falha ao criar sessão.");
     localStorage.setItem("entrega-lab-token",body.access_token);setToken(body.access_token);await refresh(body.access_token);
   }catch(e){setError((e as Error).message);}finally{setLoading(false);}
 }
 async function action(input:Record<string,unknown>){
   setLoading(true);setError("");
   try{
     const res=await fetch("/api/demo",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(input)});
     const body=await res.json();if(!res.ok)throw Error(body.error||"Não foi possível salvar.");
     if(input.action==="order")setSelected(body.id);
     if(input.action==="courier")setCourierName("");
     await refresh(token);
   }catch(e){setError((e as Error).message);}finally{setLoading(false);}
 }
 async function copy(path:string){
   const value=window.location.origin+path;
   try{await navigator.clipboard.writeText(value);setCopied(path);window.setTimeout(()=>setCopied(""),2200);}
   catch{setError("Abra o link para compartilhá-lo.");}
 }
 const orders=data?.orders||[];
 const couriers=data?.couriers||[];
 const focus=orders.find(o=>o.id===selected)||orders[0];
 return <div className="shell"><header className="topbar"><Link href="/" className="wordmark"><span className="wordmark-symbol">ES</span><span>Entrega Segura<small>Laboratório conectado</small></span></Link><span className="version-pill">TESTE MULTIDISPOSITIVO</span></header>
 <main className="app-content lab-page">
 <div className="page-title"><div><span className="overline">NEON / SIMULAÇÃO</span><h1>Operação de teste</h1><p>Pedidos fictícios, links independentes e acompanhamento compartilhado entre celulares.</p></div><Link href="/demo" className="button ghost-button">Simulação local</Link></div>
 {error&&<p className="inline-error" role="alert">{error}</p>}
 {!data?<section className="detail-panel lab-start"><div><span className="overline">AMBIENTE ISOLADO</span><h2>Iniciar uma sessão de demonstração</h2><p>O Neon cria um pedido e um entregador de teste. A sessão dura 24 horas, e os links de cada pedido podem ser abertos em aparelhos diferentes.</p><p>Não informe nomes e endereços de pessoas reais.</p></div><button disabled={loading} className="button main-button" onClick={start}>Iniciar teste <ArrowRight size={15}/></button></section>:
 <>
 <div className="kpi-grid"><div className="kpi"><small>Pedidos de teste</small><strong>{orders.length}</strong><span>Sessão atual</span></div><div className="kpi"><small>Em andamento</small><strong>{orders.filter(x=>!["delivered","cancelled"].includes(x.status)).length}</strong><span>Ativos</span></div><div className="kpi"><small>Em rota</small><strong>{orders.filter(x=>x.status==="on_route").length}</strong><span>Atualização contínua</span></div><div className="kpi"><small>Cliente pronto</small><strong>{orders.filter(x=>x.customer_ready).length}</strong><span>Confirmações</span></div></div>
 <div className="lab-grid">
 <div>
 <section className="detail-panel lab-form"><div className="section-top"><div><h2>Criar pedido</h2><p>Dados fictícios para validar o despacho</p></div><span className="version-pill">TESTE</span></div>
 <form onSubmit={e=>{e.preventDefault();void action({action:"order",customer:newCustomer,destination:address});}}><div className="form-grid"><div><label>Nome de teste</label><input required minLength={2} value={newCustomer} onChange={e=>setNewCustomer(e.target.value)}/></div><div><label>Destino de teste</label><input required minLength={3} value={address} onChange={e=>setAddress(e.target.value)}/></div></div><div className="lab-form-footer"><span>O link de acompanhamento é gerado automaticamente.</span><button disabled={loading} className="button main-button" type="submit"><Plus size={15}/> Criar pedido</button></div></form></section>
 <section className="order-panel lab-orders"><div className="section-top"><div><h2>Fila de entregas</h2><p>O painel consulta o Neon a cada cinco segundos.</p></div><span className="count-chip">{orders.length}</span></div>
 <div className="order-list">{orders.map(o=><button className={`order-row ${focus?.id===o.id?"row-active":""}`} key={o.id} onClick={()=>setSelected(o.id)}><span className="row-top"><strong>{o.customer_name}</strong><span className={`status-tag status-${o.status}`}>{names[o.status]||o.status}</span></span><span className="row-address">{o.destination}</span><span className="row-end"><span>#{o.id.slice(0,8).toUpperCase()}</span><span>{o.courier_name||"Não atribuído"}</span></span></button>)}</div></section>
 <section className="team-section lab-couriers"><div className="section-top"><div><h2>Entregadores do teste</h2><p>Cadastre e atribua a um pedido.</p></div></div><div className="team-list">{couriers.map(c=><div key={c.id} className="team-person"><div className="avatar">{c.name[0]?.toUpperCase()}</div><div><strong>{c.name}</strong><small>Disponível para teste</small></div></div>)}</div><form className="lab-add-courier" onSubmit={e=>{e.preventDefault();void action({action:"courier",name:courierName});}}><input required minLength={2} placeholder="Novo entregador de teste" value={courierName} onChange={e=>setCourierName(e.target.value)}/><button disabled={loading} className="button ghost-button">Adicionar</button></form></section>
 </div>
 <aside className="detail-panel lab-detail">{focus?<><div className="section-top"><div><span className="overline">PEDIDO SELECIONADO</span><h2>#{focus.id.slice(0,8).toUpperCase()}</h2></div><span className={`status-tag status-${focus.status}`}>{names[focus.status]||focus.status}</span></div><div className="details-pair"><span>Cliente</span><strong>{focus.customer_name}</strong></div><div className="details-pair"><span>Destino</span><strong>{focus.destination}</strong></div><div className="details-pair"><span>Entregador</span><strong>{focus.courier_name}</strong></div><div className="details-pair"><span>Confirmação do cliente</span><strong>{focus.customer_ready?"Pronto para receber":"Pendente"}</strong></div>
 {focus.status==="preparing"&&<><label>Atribuir entregador</label><select value={focus.courier_id} disabled={loading} onChange={e=>void action({action:"assign",courier_id:e.target.value,order_id:focus.id})}>{couriers.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></>}
 <div className="lab-share"><strong>Acessos individuais</strong><p>Abra cada endereço em uma aba ou outro celular. São links diferentes para esta mesma entrega.</p>
 <div className="lab-link-row"><a className="button ghost-button" href={url("courier",focus)} target="_blank" rel="noreferrer"><Truck size={15}/> Entregador</a><button className="button ghost-button" onClick={()=>void copy(url("courier",focus))}><Clipboard size={14}/>{copied===url("courier",focus)?"Copiado":"Copiar link"}</button></div>
 <div className="lab-link-row"><a className="button ghost-button" href={url("client",focus)} target="_blank" rel="noreferrer"><Route size={15}/> Consumidor</a><button className="button ghost-button" onClick={()=>void copy(url("client",focus))}><Clipboard size={14}/>{copied===url("client",focus)?"Copiado":"Copiar link"}</button></div></div>
 <MapSurface destination={focus.destination} latitude={focus.latitude} longitude={focus.longitude} updatedAt={focus.location_updated_at}/>
 {focus.location_source==="simulation"&&<p className="lab-caption">Posição simulada para teste; não é GPS real.</p>}
 </>:<p>Nenhum pedido selecionado.</p>}</aside>
 </div><p className="notice">Este laboratório é uma simulação isolada. Para testar: abra o link do entregador, inicie um trajeto, depois acompanhe pelo link do consumidor. Sessão válida por 24 horas. Dados reais e pagamentos não são permitidos.</p>
 </>}
 </main><footer className="footbar"><span>Entrega Segura · Laboratório do MVP</span><span>Next.js · Cloudflare Workers · Neon PostgreSQL</span></footer></div>;
}
