"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Bell, Bike, Check,
  CheckCircle2, ChevronDown, Clock3, Copy, Headphones, Home, MapPin,
  Menu, Package, Plus, Search, ShieldCheck, SlidersHorizontal, Sparkles,
  Store, TrendingUp, UserRound, Wallet, X, type LucideIcon
} from "lucide-react";

type Role = "estabelecimento" | "entregador" | "consumidor";
type Status = "Preparando" | "Em rota" | "Chegou" | "Entregue";
type Pedido = { id: number; cliente: string; destino: string; entregador: string; status: Status; pronto: boolean; criado: number };
const INITIAL: Pedido[] = [
  { id: 1042, cliente: "Ana Costa", destino: "Rua das Flores, Centro", entregador: "Rafael", status: "Em rota", pronto: false, criado: Date.now() - 28 * 60000 },
  { id: 1043, cliente: "Bruno Lima", destino: "Av. Brasil, Zona 7", entregador: "Rafael", status: "Preparando", pronto: false, criado: Date.now() - 13 * 60000 },
  { id: 1044, cliente: "Carla Souza", destino: "Rua Santos Dumont, Zona 3", entregador: "Rafael", status: "Entregue", pronto: true, criado: Date.now() - 105 * 60000 },
  { id: 1045, cliente: "Marcos Vieira", destino: "Av. Colombo, Jardim", entregador: "Rafael", status: "Chegou", pronto: true, criado: Date.now() - 39 * 60000 },
];
const STATUS: Status[] = ["Preparando", "Em rota", "Chegou", "Entregue"];
const nav: Record<Role, { key: string; label: string; Icon: LucideIcon }[]> = {
  estabelecimento: [{ key: "inicio", label: "Visão geral", Icon: Home }, { key: "pedidos", label: "Pedidos", Icon: Package }, { key: "novo", label: "Novo pedido", Icon: Plus }],
  entregador: [{ key: "inicio", label: "Início", Icon: Home }, { key: "entregas", label: "Entregas", Icon: Bike }, { key: "ganhos", label: "Ganhos", Icon: Wallet }],
  consumidor: [{ key: "inicio", label: "Rastrear", Icon: MapPin }, { key: "ajuda", label: "Ajuda", Icon: Headphones }],
};
const roleLabels: Record<Role, string> = { estabelecimento: "Estabelecimento", entregador: "Entregador", consumidor: "Cliente" };
const statusClass = (status: Status) => ({ "Preparando": "orange", "Em rota": "blue", "Chegou": "pink", "Entregue": "green" }[status]);
const currency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const clock = (date: number) => new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const flight = (status: Status) => STATUS.indexOf(status);

function Mark({ tiny = false }: { tiny?: boolean }) {
  return <span className={`brand-mark${tiny ? " brand-mark-small" : ""}`} aria-hidden="true"><Package size={tiny ? 18 : 24} strokeWidth={2.3}/><span className="brand-mark-dot"/></span>;
}
function Doodle({ className = "" }: { className?: string }) {
  return <svg className={`doodle ${className}`} width="42" height="37" viewBox="0 0 42 37" fill="none" aria-hidden="true"><path d="M7 7L3 1M24 9l2-8M32 22l9 1M5 29l-4 6" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"/><path d="M16 17l9 10" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"/></svg>;
}
function CourierArt() {
  return <svg className="courier-art" viewBox="0 0 230 178" fill="none" aria-hidden="true">
    <path d="M169 28c22-28 59-14 57 15-1 25-28 26-28 49" stroke="#111" strokeWidth="2" strokeDasharray="3 7" strokeLinecap="round"/>
    <path d="M20 145h188" stroke="#111" strokeWidth="2" strokeLinecap="round" opacity=".4"/>
    <circle cx="70" cy="133" r="24" fill="#FFF" stroke="#111" strokeWidth="4"/><circle cx="70" cy="133" r="9" fill="#9DB9FA" stroke="#111" strokeWidth="3"/>
    <circle cx="184" cy="133" r="24" fill="#FFF" stroke="#111" strokeWidth="4"/><circle cx="184" cy="133" r="9" fill="#9DB9FA" stroke="#111" strokeWidth="3"/>
    <path d="M69 133l34-47 27 47H69Zm59 0h56l-25-46h-41" fill="#FFF" stroke="#111" strokeWidth="4" strokeLinejoin="round"/>
    <path d="M124 134l18-44 17-3" stroke="#111" strokeWidth="4" strokeLinecap="round"/>
    <rect x="31" y="77" width="48" height="40" rx="5" fill="#FF963B" stroke="#111" strokeWidth="3"/><path d="M31 90h48M53 78v12" stroke="#111" strokeWidth="2"/>
    <path d="M112 75l29 12-17 19-24-16" fill="#E69AF3" stroke="#111" strokeWidth="3" strokeLinejoin="round"/>
    <path d="M121 98l14 28-12 7M111 99l-14 28-12 5" stroke="#111" strokeWidth="7" strokeLinecap="round"/>
    <path d="M119 66l-5 28 21 14 16-32-14-9" fill="#E69AF3" stroke="#111" strokeWidth="3" strokeLinejoin="round"/>
    <path d="M139 78l24 7 6 11" stroke="#111" strokeWidth="6" strokeLinecap="round"/>
    <circle cx="136" cy="46" r="19" fill="#FFF" stroke="#111" strokeWidth="3"/>
    <path d="M116 45c-2-23 38-28 40 2h-40Z" fill="#111"/><path d="M119 39c5-13 24-15 32-2" stroke="#9DB9FA" strokeWidth="8" strokeLinecap="round"/>
    <path d="M157 48l10 4-11 3" fill="#111"/><circle cx="147" cy="49" r="2" fill="#111"/>
    <path d="M13 106h17M14 117h11" stroke="#111" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M188 21l4 9 10 3-10 4-4 9-4-9-10-4 10-3 4-9Z" fill="#FFF" stroke="#111" strokeWidth="2"/>
  </svg>;
}
function MapArt({ status }: { status: Status }) {
  const pct = [0, 45, 78, 100][flight(status)];
  return <div className="map-art" role="img" aria-label="Mapa ilustrativo da rota da entrega. Não representa localização real.">
    <svg viewBox="0 0 560 270" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="560" height="270" fill="#F0F3FA"/>
      <path d="M-10 35H580M-10 104H580M-10 195H580M62-10V300M170-10V300M292-10V300M405-10V300M512-10V300" stroke="white" strokeWidth="19"/>
      <path d="M-10 235L270-10M80 310L430-10M325 300L590 53" stroke="white" strokeWidth="15"/>
      <rect x="200" y="130" width="104" height="58" rx="14" fill="#BDEACD"/>
      <rect x="25" y="40" width="88" height="52" rx="13" fill="#E3E8F6"/>
      <rect x="418" y="45" width="85" height="58" rx="13" fill="#E3E8F6"/>
      <path d="M55 211H151Q165 211 165 190V91Q165 80 182 80H322Q341 80 341 100V142H477" stroke="#9DB9FA" strokeWidth="13" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M55 211H151Q165 211 165 190V91Q165 80 182 80H322Q341 80 341 100V142H477" stroke="#335FE0" strokeWidth="5" fill="none" strokeDasharray={`${pct * 4.2} 500`} strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="55" cy="211" r="11" fill="#FF963B" stroke="#111" strokeWidth="3"/><circle cx="477" cy="142" r="12" fill="#111"/><circle cx="477" cy="142" r="4" fill="white"/>
      <circle cx={pct === 100 ? 477 : pct >= 78 ? 341 : pct >= 45 ? 165 : 55} cy={pct === 100 ? 142 : pct >= 78 ? 142 : pct >= 45 ? 140 : 211} r="11" fill="#E69AF3" stroke="#111" strokeWidth="3"/>
    </svg>
    <span className="map-legend"><MapPin size={13}/> Mapa demonstrativo</span>
  </div>;
}
function Pill({ status }: { status: Status }) { return <span className={`status-pill status-${statusClass(status)}`}>{status === "Entregue" ? <Check size={13}/> : <span className="status-dot"/>}{status}</span>; }
function CTA({ children, onClick, ghost = false, disabled = false, className = "", title }: {children: React.ReactNode; onClick?: () => void; ghost?: boolean; disabled?: boolean; className?: string; title?: string}) { return <button type="button" title={title} disabled={disabled} className={`btn ${ghost ? "btn-ghost" : "btn-dark"} ${className}`} onClick={onClick}>{children}</button>; }

export default function HomePage() {
  const [pedidos, setPedidos] = useState<Pedido[]>(INITIAL);
  const [loaded, setLoaded] = useState(false);
  const [role, setRole] = useState<Role>("estabelecimento");
  const [section, setSection] = useState("inicio");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Status | "Todos">("Todos");
  const [selected, setSelected] = useState(1042);
  const [modal, setModal] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [note, setNote] = useState("");
  const [form, setForm] = useState({ cliente: "", destino: "", entregador: "Rafael" });
  const [online, setOnline] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const match = window.location.hash.match(/^#pedido-(\d+)$/);
    if (match) { setSelected(Number(match[1])); setRole("consumidor"); setSection("inicio"); }
    try {
      const stored = localStorage.getItem("entrega-segura-demo");
      if (stored) {
        const data: unknown = JSON.parse(stored);
        if (Array.isArray(data) && data.every(p => p && typeof p.id === "number" && typeof p.cliente === "string" && STATUS.includes(p.status))) {
          setPedidos(data.map((p: Pedido) => ({ ...p, criado: p.criado || Date.now() })));
        }
      }
    } catch { /* conteúdo salvo inválido: manter dados de demonstração */ }
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) { try { localStorage.setItem("entrega-segura-demo", JSON.stringify(pedidos)); } catch {} } }, [pedidos, loaded]);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(""), 3200); return () => clearTimeout(t); }, [note]);

  const finished = pedidos.filter(p => p.status === "Entregue").length;
  const active = pedidos.filter(p => p.status !== "Entregue").length;
  const preparing = pedidos.filter(p => p.status === "Preparando").length;
  const inRoute = pedidos.filter(p => p.status === "Em rota" || p.status === "Chegou").length;
  const selectedOrder = pedidos.find(p => p.id === selected) || pedidos[0];
  const filtered = useMemo(() => pedidos.filter(p =>
    (filter === "Todos" || p.status === filter) &&
    (`${p.id} ${p.cliente} ${p.destino}`.toLowerCase().includes(query.toLowerCase()))
  ).sort((a,b) => b.id - a.id), [pedidos,filter,query]);

  function moveRole(next: Role) { setRole(next); setSection("inicio"); setMobileMenu(false); }
  function go(next: string) { setSection(next); setMobileMenu(false); }
  function updateOrder(id: number, status: Status) {
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    setNote(`Pedido #${id} atualizado: ${status}`);
  }
  function createOrder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (form.cliente.trim().length < 2 || form.destino.trim().length < 6) { setNote("Informe nome e endereço completo."); return; }
    const id = Math.max(1042, ...pedidos.map(p => p.id)) + 1;
    setPedidos(prev => [{ id, cliente: form.cliente.trim(), destino: form.destino.trim(), entregador: form.entregador.trim() || "A definir", status: "Preparando", pronto: false, criado: Date.now() }, ...prev]);
    setSelected(id); setForm({ cliente:"", destino:"", entregador:"Rafael" }); setModal(false);
    setNote(`Pedido #${id} criado na demonstração.`); setSection("pedidos");
  }
  const orderList = (items: Pedido[], allowUpdate = false) => <div className="order-list">{items.length ? items.map(p => <article key={p.id} className="order-row">
    <span className={`order-icon order-${statusClass(p.status)}`}><Package size={20} strokeWidth={1.9}/></span>
    <div className="order-info"><strong>#{p.id} <span>· {p.cliente}</span></strong><small>{p.destino} <span className="order-time">· {clock(p.criado)}</span></small></div>
    <Pill status={p.status}/>
    {allowUpdate ? <label className="sr-only" htmlFor={`st-${p.id}`}>Alterar status do pedido {p.id}</label> : null}
    {allowUpdate ? <select id={`st-${p.id}`} aria-label={`Status do pedido ${p.id}`} className="mini-select" value={p.status} onChange={e => updateOrder(p.id, e.target.value as Status)}>{STATUS.map(s => <option key={s} value={s}>{s}</option>)}</select> : <button className="row-next" aria-label={`Acompanhar pedido ${p.id}`} onClick={() => { setSelected(p.id); moveRole("consumidor"); }}><ArrowUpRight size={17}/></button>}
  </article>) : <div className="empty-state"><Package size={24}/><strong>Nenhum pedido encontrado</strong><span>Experimente alterar os filtros.</span></div>}</div>;

  const header = <div className="app-header"><div><div className="page-overline">{role === "estabelecimento" ? "PAINEL DO ESTABELECIMENTO" : role === "entregador" ? "ESPAÇO DO ENTREGADOR" : "ACOMPANHAMENTO DE PEDIDO"}</div><div className="head-title-line"><h1>{role === "estabelecimento" ? "Olá, Café Nuvem" : role === "entregador" ? "Olá, Rafael!" : "Sua entrega"}</h1><span className="hello-spark">✳</span></div><p>{role === "estabelecimento" ? "Acompanhe o ritmo das suas entregas." : role === "entregador" ? "Pronto para as entregas de hoje?" : "Tudo o que você precisa saber, em um só lugar."}</p></div><div className="head-controls"><span className="today-chip">{new Date().toLocaleDateString("pt-BR", { day:"2-digit",month:"short" })}</span><button className="circle-btn bell" aria-label="Notificações" onClick={() => setNotifications(true)}><Bell size={20}/><i/></button><span className="avatar" aria-label="Perfil ilustrativo">{role === "estabelecimento" ? "CN" : role === "entregador" ? "RF" : "ES"}</span></div></div>;

  const summary = <div className="dashboard-grid">
    <div className="hero-tile brand-blue"><div className="tile-top"><span className="tile-label">{role === "entregador" ? "ENTREGAS DE HOJE" : "VISÃO GERAL · HOJE"}</span><span className="hero-asterisk">✳</span></div><h2>{role === "entregador" ? "Tudo em movimento." : "Seu dia está em movimento."}</h2><p>{role === "entregador" ? "Acompanhe suas entregas sem complicação." : "Mais praticidade para quem faz acontecer."}</p><div className="hero-number"><strong>{role === "entregador" ? active : pedidos.length}</strong><div><span>{role === "entregador" ? "entregas" : "pedidos"}</span><small>{role === "entregador" ? "na sua fila" : "registrados no painel"}</small></div></div><CourierArt/><div className="hero-bottom"><div className="progress-mini"><span style={{width: `${pedidos.length ? finished / pedidos.length * 100 : 0}%`}}/></div><CTA onClick={() => go(role === "entregador" ? "entregas" : "pedidos")}>{role === "entregador" ? "Ver minhas rotas" : "Ver pedidos"}<ArrowUpRight size={17}/></CTA></div><Doodle className="hero-doodle"/></div>
    <div className="stat-tile soft-green"><div className="stat-caption"><span>Concluídas</span><CheckCircle2 size={23}/></div><strong>{String(finished).padStart(2,"0")}</strong><small>Entregas finalizadas</small><span className="stat-bottom">Tudo certo por aqui <ArrowUpRight size={15}/></span></div>
    <div className="stat-tile soft-pink"><div className="stat-caption"><span>Em andamento</span><Bike size={23}/></div><strong>{String(active).padStart(2,"0")}</strong><small>Pedidos em aberto</small><span className="stat-bottom">Acompanhar agora <ArrowUpRight size={15}/></span></div>
    <div className="wide-tile"><div><div className="eyebrow-small">{role === "entregador" ? "SEUS GANHOS · EXEMPLO" : "OPERAÇÃO EM TEMPO REAL"}</div><h3>{role === "entregador" ? currency(finished * 9.5) : `${inRoute} entregas na rua`}</h3><p>{role === "entregador" ? "Estimativa ilustrativa com base nas entregas concluídas." : `${preparing} em preparação · ${finished} concluídas`}</p></div><span className="wide-orbit"><TrendingUp size={28}/></span><span className="wide-flare">✦</span></div>
  </div>;

  const dashboard = <>{header}{summary}<div className="content-grid"><section className="surface-card recent"><div className="section-header"><div><span className="eyebrow-small">ACOMPANHAMENTO</span><h2>{role === "entregador" ? "Próximas entregas" : "Pedidos recentes"}</h2></div><button className="text-link" onClick={() => go(role === "entregador" ? "entregas" : "pedidos")}>Ver todos <ArrowUpRight size={16}/></button></div>{orderList(pedidos.slice(0,4),role === "entregador")}</section><aside className="side-stack"><div className="dark-action"><div className="dark-head"><span className="dark-label">{role === "entregador" ? "STATUS" : "AÇÃO RÁPIDA"}</span><span className="mini-flower">✳</span></div><h2>{role === "entregador" ? online ? "Você está online." : "Você está offline." : "Bora agilizar?"}</h2><p>{role === "entregador" ? "Defina sua disponibilidade para receber entregas." : "Crie um novo pedido e acompanhe cada etapa."}</p><CTA onClick={() => role === "entregador" ? (setOnline(!online), setNote(!online ? "Você ficou online." : "Você ficou offline.")) : setModal(true)} className="white-cta">{role === "entregador" ? online ? "Ficar offline" : "Ficar online" : "Novo pedido"}<ArrowUpRight size={16}/></CTA><span className="dark-oval"/></div><div className="tip-card"><div className="tip-icon"><ShieldCheck size={23}/></div><div><strong>Entrega Segura</strong><p>Uma experiência de entrega mais clara e organizada para todos.</p></div><ArrowUpRight size={18}/></div></aside></div></>;

  const ordersScreen = <>{header}<div className="section-title"><div><span className="eyebrow-small">GERENCIAMENTO</span><h2>{role === "entregador" ? "Minhas entregas" : "Todos os pedidos"}</h2><p>Encontre e atualize os pedidos da demonstração.</p></div>{role === "estabelecimento" && <CTA onClick={() => setModal(true)}><Plus size={17}/> Novo pedido</CTA>}</div><div className="filter-panel"><label className="searchbox"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar pedido ou cliente..." aria-label="Buscar pedidos"/></label><label className="selectbox"><SlidersHorizontal size={17}/><select value={filter} onChange={e => setFilter(e.target.value as Status | "Todos")} aria-label="Filtrar por status"><option>Todos</option>{STATUS.map(s=><option key={s}>{s}</option>)}</select><ChevronDown size={15}/></label></div><section className="surface-card">{orderList(filtered,true)}</section></>;

  const earningsScreen = <>{header}<div className="section-title"><div><span className="eyebrow-small">RESUMO FINANCEIRO · DEMONSTRAÇÃO</span><h2>Seus ganhos</h2><p>Valores ilustrativos, sem pagamento real.</p></div></div><div className="earnings-grid"><div className="earnings-large brand-blue"><Wallet size={28}/><span>Ganhos estimados</span><strong>{currency(finished * 9.5)}</strong><small>Baseado em {finished} entrega(s) concluída(s)</small></div><div className="earning-side soft-orange"><TrendingUp size={27}/><strong>{finished}</strong><span>Entregas concluídas</span></div></div><section className="surface-card"><div className="section-header"><h2>Histórico de entregas</h2></div>{orderList(pedidos.filter(p=>p.status === "Entregue"))}</section></>;

  const tracking = <>{header}<div className="tracking-layout"><div className="tracking-main"><div className="tracking-hero brand-blue"><div className="r-b"><span className="tile-label">RASTREAMENTO</span><span className="tracking-spark">✳</span></div><div className="tracking-order">Pedido <strong>#{selectedOrder?.id || "—"}</strong></div><h2>{selectedOrder?.status === "Entregue" ? "Chegou!" : selectedOrder?.status === "Preparando" ? "Preparando tudo." : selectedOrder?.status === "Chegou" ? "Está pertinho!" : "Está a caminho."}</h2><p>Veja cada etapa da sua entrega.</p><div className="tracking-label"><Pill status={selectedOrder?.status || "Preparando"}/></div><div className="tracking-blob"/></div><div className="map-frame"><MapArt status={selectedOrder?.status || "Preparando"}/></div><div className="tracking-timeline">{STATUS.map((s,i)=><div key={s} className={`timeline-step ${selectedOrder && flight(selectedOrder.status) >= i ? "complete" : ""}`}><span>{selectedOrder && flight(selectedOrder.status) > i ? <Check size={16}/> : i+1}</span><small>{s}</small></div>)}</div></div><div className="tracking-side"><div className="surface-card track-info"><span className="eyebrow-small">DETALHES DO PEDIDO</span><div className="selector-wrap"><label htmlFor="choose-order">Pedido selecionado</label><select id="choose-order" value={selectedOrder?.id || ""} onChange={e => setSelected(Number(e.target.value))}>{pedidos.map(p=><option key={p.id} value={p.id}>#{p.id} · {p.cliente}</option>)}</select></div><dl><dt>Cliente</dt><dd>{selectedOrder?.cliente || "—"}</dd><dt>Entregador</dt><dd>{selectedOrder?.entregador || "—"}</dd><dt>Destino</dt><dd>{selectedOrder?.destino || "—"}</dd></dl>{selectedOrder && <CTA ghost className="full-width" onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/#pedido-${selectedOrder.id}`).then(()=>setNote("Link da demonstração copiado.")).catch(()=>setNote("Não foi possível copiar o link.")); }}><Copy size={16}/> Copiar link ilustrativo</CTA>}</div><div className="safety-card"><span className="safety-icon"><ShieldCheck size={24}/></span><div><h3>Sua entrega, sem mistério.</h3><p>Acompanhe o andamento e saiba o que vem a seguir.</p><small>Rota ilustrativa — sem GPS em tempo real.</small></div></div>{selectedOrder && <CTA className="full-width" disabled={selectedOrder.pronto} onClick={() => {setPedidos(prev=>prev.map(p=>p.id===selectedOrder.id?{...p,pronto:true}:p));setNote("Confirmação registrada nesta demonstração.");}}>{selectedOrder.pronto ? "✓ Já confirmei que estou pronto" : "Estou pronto para receber"}<ArrowRight size={16}/></CTA>}</div></div></>;

  const helpScreen = <>{header}<div className="surface-card help-card"><div className="help-icon"><Headphones size={26}/></div><h2>Precisa de ajuda?</h2><p>Este é um protótipo para explorar as telas do Entrega Segura. Contatos e localização ao vivo ainda não estão conectados.</p><CTA onClick={()=>go("inicio")}>Voltar ao rastreamento <ArrowRight size={17}/></CTA></div></>;

  return <div className="app-shell"><aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}><button className="brand-header" onClick={()=>go("inicio")}><Mark/><span>Entrega<br/><strong>Segura</strong></span></button><div className="sidebar-divider"/><span className="nav-heading">MENU PRINCIPAL</span><div className="sidebar-nav">{nav[role].map(({key,label,Icon})=><button key={key} className={`nav-item ${section===key?"is-active":""}`} onClick={()=>{if(key === "novo") setModal(true); else go(key);}}><Icon size={19} strokeWidth={2}/><span>{label}</span>{section===key&&<ArrowUpRight size={16} className="nav-trailing"/>}</button>)}</div><div className="sidebar-bottom"><div className="side-illustration"><div className="side-orbit"><Bike size={31}/></div><span className="side-spark">✳</span><p>Entregar bem é<br/><strong>ir mais longe.</strong></p></div><div className="side-foot"><ShieldCheck size={17}/> Entrega Segura <span>• Demo</span></div></div></aside>
    <div className="app-main"><div className="topbar"><div className="topbar-left"><button className="mobile-menu-button circle-btn" onClick={()=>setMobileMenu(!mobileMenu)} aria-label="Abrir menu">{mobileMenu?<X size={20}/>:<Menu size={20}/>}</button><div className="mobile-brand"><Mark tiny/><strong>Entrega Segura</strong></div><span className="breadcrumbs">Workspace <span>/</span> {roleLabels[role]}</span></div><div className="topbar-actions"><span className="demo-tag"><i/> Protótipo demonstrativo</span><div className="role-switch" role="group" aria-label="Selecionar perfil">{(["estabelecimento","entregador","consumidor"] as Role[]).map(r=><button key={r} aria-pressed={role===r} onClick={()=>moveRole(r)}>{r === "estabelecimento" ? "Loja" : r === "entregador" ? "Entregador" : "Cliente"}</button>)}</div></div></div>
      <main className="workspace">{role === "consumidor" ? section === "ajuda" ? helpScreen : tracking : section === "pedidos" || section === "entregas" ? ordersScreen : section === "ganhos" ? earningsScreen : dashboard}<div className="app-disclaimer">Protótipo com dados fictícios salvos somente neste navegador. Não inclui autenticação, sincronização entre dispositivos, GPS nem pagamentos reais.</div></main>
      <nav className="mobile-bottom" aria-label="Menu inferior">{nav[role].map(({key,label,Icon})=><button key={key} aria-current={section===key ? "page" : undefined} onClick={()=> key === "novo" ? setModal(true) : go(key)}><Icon size={20}/><span>{label}</span></button>)}</nav>
    </div>
    {modal && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false);}}><div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="r-b"><div><span className="eyebrow-small">NOVO PEDIDO</span><h2 id="modal-title">Criar entrega</h2></div><button className="circle-btn" aria-label="Fechar" onClick={()=>setModal(false)}><X size={19}/></button></div><p>Preencha os dados para adicionar um pedido nesta demonstração.</p><form onSubmit={createOrder}><label>Nome do cliente<input required minLength={2} value={form.cliente} onChange={e=>setForm({...form,cliente:e.target.value})} placeholder="Ex.: Ana Costa"/></label><label>Endereço de entrega<input required minLength={6} value={form.destino} onChange={e=>setForm({...form,destino:e.target.value})} placeholder="Rua, número e bairro"/></label><label>Entregador<input value={form.entregador} onChange={e=>setForm({...form,entregador:e.target.value})} placeholder="Nome do entregador"/></label><div className="form-actions"><CTA ghost onClick={()=>setModal(false)}>Cancelar</CTA><button className="btn btn-dark" type="submit">Criar pedido <ArrowRight size={16}/></button></div></form></div></div>}
    {notifications && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setNotifications(false);}}><div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="notifications-title"><div className="r-b"><h2 id="notifications-title">Notificações</h2><button className="circle-btn" aria-label="Fechar" onClick={()=>setNotifications(false)}><X size={19}/></button></div><div className="notification-item"><CheckCircle2 size={20}/> Você está usando o ambiente de demonstração.</div><div className="notification-item"><Package size={20}/> Existem {active} pedidos em aberto.</div><CTA onClick={()=>setNotifications(false)}>Entendi <ArrowRight size={16}/></CTA></div></div>}
    {note && <div className="toast" role="status"><CheckCircle2 size={18}/>{note}</div>}
  </div>;
}
