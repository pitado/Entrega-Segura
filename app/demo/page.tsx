"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight, Bike, Check, ChefHat, Clipboard, MapPin, Navigation,
  Minus, Package, Pause, Play, Plus, RefreshCw, Route, Search, Truck, UserRound, Warehouse,
} from "lucide-react";
import { wazeDirectionsUrl } from "../../lib/navigation";
import "./demo.css";

const statuses = {
  preparing: { label: "Em preparo", icon: ChefHat },
  on_route: { label: "Em rota", icon: Truck },
  arrived: { label: "No destino", icon: MapPin },
  delivered: { label: "Entregue", icon: Package },
};
type Status = keyof typeof statuses;
type View = "merchant" | "courier" | "customer";
type Order = {
  id: number;
  customer: string;
  courier: string;
  destination: string;
  status: Status;
  ready: boolean;
  sharing: boolean;
  step: number;
  updatedAt: string;
};
type Demo = { orders: Order[]; selected: number };

const storageKey = "entrega-segura-test-trip-v3";
const priorKey = "entrega-segura-test-trip-v2";
const views: Record<View, string> = { merchant: "Estabelecimento", courier: "Entregador", customer: "Cliente" };
const profileIcons = { merchant: Warehouse, courier: Bike, customer: MapPin };
const stages = Object.keys(statuses) as Status[];
// Coordinates on the illustrated map, independent of the geographic destination.
const schematic = [[22, 76], [29, 72], [34, 68], [42, 68], [49, 67], [51, 59],
  [53, 49], [62, 48], [65, 46], [67, 38], [76, 37], [84, 28]];
const lastStep = schematic.length - 1;
const destination = { lat: -23.42018, lng: -51.92776 };

function newOrder(id: number, customer: string, courier: string, status: Status = "preparing", region = "Região central, Maringá"): Order {
  return {
    id, customer, courier, status, destination: region, ready: false, sharing: false,
    step: status === "delivered" || status === "arrived" ? lastStep : 0, updatedAt: "",
  };
}

function initialDemo(): Demo {
  return {
    selected: 1042,
    orders: [
      newOrder(1042, "Ana Costa", "Lucas", "on_route"),
      newOrder(1043, "Pedro Almeida", "Mariana", "preparing", "Zona 07, Maringá"),
      newOrder(1044, "Juliana Ribeiro", "Rafael", "delivered", "Jardim Alvorada, Maringá"),
    ],
  };
}

function readOrder(input: Partial<Order>, fallback: Order): Order {
  return {
    ...fallback,
    customer: typeof input.customer === "string" ? input.customer.slice(0, 90) : fallback.customer,
    courier: typeof input.courier === "string" ? input.courier.slice(0, 90) : fallback.courier,
    destination: typeof input.destination === "string" ? input.destination.slice(0, 160) : fallback.destination,
    status: input.status && stages.includes(input.status) ? input.status : fallback.status,
    ready: Boolean(input.ready),
    sharing: Boolean(input.sharing),
    step: Math.max(0, Math.min(lastStep, Math.trunc(Number(input.step) || 0))),
    updatedAt: typeof input.updatedAt === "string" && Number.isFinite(Date.parse(input.updatedAt)) ? input.updatedAt : "",
  };
}

function readDemo(saved?: string | null, prior?: string | null): Demo {
  const fallback = initialDemo();
  try {
    if (saved) {
      const data = JSON.parse(saved) as Partial<Demo>;
      const orders = data.orders?.filter(order => order && Number.isSafeInteger(order.id)).map(
        order => readOrder(order, newOrder(order.id, "Cliente teste", "Entregador teste")),
      );
      if (orders?.length) {
        return { orders, selected: orders.find(order => order.id === data.selected)?.id ?? orders[0].id };
      }
    }
    if (prior) fallback.orders[0] = readOrder(JSON.parse(prior), fallback.orders[0]);
  } catch {
    return fallback;
  }
  return fallback;
}

function Pill({ children, onClick, secondary = false, disabled = false }: {
  children: ReactNode; onClick: () => void; secondary?: boolean; disabled?: boolean;
}) {
  return <button type="button" className={secondary ? "trip-pill trip-secondary" : "trip-pill"}
    onClick={onClick} disabled={disabled}>{children}</button>;
}

function StatusBadge({ status, withIcon = false }: { status: Status; withIcon?: boolean }) {
  const { icon: Icon, label } = statuses[status];
  return <span className={`trip-status trip-${status}`}>{withIcon && <Icon size={23} aria-hidden="true" />}{label}</span>;
}

function Timeline({ status, title = false }: { status: Status; title?: boolean }) {
  const active = stages.indexOf(status);
  return <section className={`trip-timeline trip-paper${title ? " trip-timeline-wide" : ""}`} aria-label="Etapas da entrega">
    {title && <h2>Etapas da entrega</h2>}
    <ol>{stages.map((stage, index) => {
      const Icon = statuses[stage].icon;
      return <li key={stage} aria-current={index === active ? "step" : undefined} data-complete={index < active}>
        <span className={`trip-stage-icon trip-${stage}`}><Icon size={27} aria-hidden="true" /></span>
        <span>{statuses[stage].label}</span>
      </li>;
    })}</ol>
  </section>;
}

function IllustratedMap({ order }: { order: Order }) {
  const [zoom, setZoom] = useState(1);
  const routeLayer = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = routeLayer.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      canvas.width = width * scale;
      canvas.height = height * scale;
      context.scale(scale, scale);
      const points = schematic.map(([x, y]) => [x * width / 100, y * height / 100]);
      context.beginPath();
      context.moveTo(...points[0] as [number, number]);
      for (let i = 1; i < points.length - 1; i++) {
        const [x, y] = points[i];
        const [nextX, nextY] = points[i + 1];
        context.quadraticCurveTo(x, y, (x + nextX) / 2, (y + nextY) / 2);
      }
      context.lineTo(...points[points.length - 1] as [number, number]);
      context.lineCap = "round";
      context.lineWidth = 13;
      context.strokeStyle = "#fff";
      context.stroke();
      context.lineWidth = 8;
      context.strokeStyle = "#6387f4";
      context.stroke();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const [x, y] = schematic[order.step];
  return <section className="trip-map" aria-label="Mapa do trajeto simulado">
    <div className="trip-map-scene" style={{ transform: `scale(${zoom})` }}>
      <canvas ref={routeLayer} className="trip-map-line" aria-hidden="true" />
      <img className="trip-map-pin" src="/redesign/destination-pin.webp" alt="Destino" />
      <span className="trip-map-bike" style={{ left: `${x}%`, top: `${y}%` }}
        role="img" aria-label="Posição simulada do entregador"><img src="/redesign/courier-pin.webp" alt="" /></span>
    </div>
    <span className="trip-map-label"><Route size={21} aria-hidden="true" /> Trajeto simulado</span>
    <span className="trip-map-city">Maringá</span>
    <div className="trip-map-controls" role="group" aria-label="Zoom do mapa">
      <button type="button" aria-label="Aproximar mapa" disabled={zoom >= 1.5}
        onClick={() => setZoom(value => Math.min(1.5, value + .25))}><Plus size={18} /></button>
      <button type="button" aria-label="Afastar mapa" disabled={zoom <= 1}
        onClick={() => setZoom(value => Math.max(1, value - .25))}><Minus size={18} /></button>
    </div>
  </section>;
}

export default function DemoPage() {
  const [demo, setDemo] = useState(initialDemo);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<View>("merchant");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Status | "all" | "active">("all");
  const [modal, setModal] = useState<"create" | "details" | "navigation" | null>(null);
  const [feedback, setFeedback] = useState("");
  const [manualLink, setManualLink] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const lens = useRef<HTMLSpanElement>(null);
  const lensMotion = useRef<Animation | undefined>(undefined);
  const order = demo.orders.find(item => item.id === demo.selected) ?? demo.orders[0];

  useEffect(() => {
    function readLocation(state: Demo) {
      const params = new URLSearchParams(window.location.search);
      const profile = params.get("view") as View | null;
      setView(profile && Object.hasOwn(views, profile) ? profile : "merchant");
      const id = Number(params.get("pedido"));
      return state.orders.some(item => item.id === id) ? { ...state, selected: id } : state;
    }
    try {
      setDemo(readLocation(readDemo(localStorage.getItem(storageKey), localStorage.getItem(priorKey))));
    } catch {
      setDemo(readLocation(initialDemo()));
    }
    setLoaded(true);
    function sync(event: StorageEvent) {
      if (event.key !== storageKey || !event.newValue) return;
      const next = readDemo(event.newValue);
      setDemo(current => {
        const selected = next.orders.some(item => item.id === current.selected) ? current.selected : next.selected;
        return JSON.stringify(current.orders) === JSON.stringify(next.orders) ? current : { ...next, selected };
      });
    }
    function onBack() { setDemo(current => readLocation(current)); }
    window.addEventListener("storage", sync);
    window.addEventListener("popstate", onBack);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("popstate", onBack);
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      const previous = localStorage.getItem(storageKey);
      if (previous && JSON.stringify(readDemo(previous).orders) === JSON.stringify(demo.orders)) return;
      localStorage.setItem(storageKey, JSON.stringify(demo));
    } catch {
      // The current session still works when browser storage is disabled.
    }
  }, [demo, loaded]);

  useEffect(() => {
    if (!loaded || !order.sharing || order.status !== "on_route") return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setDemo(current => ({
        ...current,
        orders: current.orders.map(item => {
          if (item.id !== order.id || item.status !== "on_route" || !item.sharing) return item;
          const step = Math.min(lastStep, item.step + 1);
          return { ...item, step, sharing: step < lastStep, updatedAt: new Date().toISOString() };
        }),
      }));
    }, 3000);
    return () => window.clearInterval(timer);
  }, [loaded, order.id, order.sharing, order.status]);

  useEffect(() => {
    if (modal && !dialog.current?.open) dialog.current?.showModal();
    else if (!modal) dialog.current?.close();
  }, [modal]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(""), 4500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  function switchView(next: View) {
    if (next !== view) {
      window.scrollTo({ top: 0, behavior: "instant" });
      if (window.matchMedia("(max-width: 580px) and (prefers-reduced-motion: no-preference)").matches) {
        lensMotion.current?.cancel();
        lensMotion.current = lens.current?.animate?.([
          { transform: "scale(1)" },
          { transform: "scale(1.12, .92)", offset: .28 },
          { transform: "scale(.99, 1.015)", offset: .8 },
          { transform: "scale(1)" },
        ], { duration: 400, easing: "cubic-bezier(.2, .7, .3, 1)" });
      }
    }
    setView(next);
    const url = new URL(window.location.href);
    url.searchParams.set("view", next);
    url.searchParams.set("pedido", String(order.id));
    window.history.replaceState(null, "", url);
  }

  function move(update: Partial<Order>) {
    setDemo(current => ({
      ...current,
      orders: current.orders.map(item => item.id === order.id ? { ...item, ...update, updatedAt: new Date().toISOString() } : item),
    }));
  }

  function openOrder(id: number) {
    setDemo(current => ({ ...current, selected: id }));
    const url = new URL(window.location.href);
    url.searchParams.set("pedido", String(id));
    window.history.replaceState(null, "", url);
    setManualLink("");
    setModal("details");
  }

  function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = new FormData(event.currentTarget);
    const customer = String(input.get("customer") ?? "").trim();
    const courier = String(input.get("courier") ?? "").trim();
    if (!customer || !courier) {
      setFeedback("Preencha o nome do cliente e do entregador.");
      return;
    }
    const id = Math.max(...demo.orders.map(item => item.id)) + 1;
    setDemo(current => ({ orders: [newOrder(id, customer, courier), ...current.orders], selected: id }));
    const url = new URL(window.location.href);
    url.searchParams.set("pedido", String(id));
    window.history.replaceState(null, "", url);
    setSearch("");
    setFilter("all");
    setModal(null);
    setFeedback("Pedido demonstrativo criado");
  }

  async function copyLink(profile: View) {
    const url = new URL("/demo", window.location.origin);
    url.searchParams.set("view", profile);
    url.searchParams.set("pedido", String(order.id));
    try {
      await navigator.clipboard.writeText(url.toString());
      setFeedback("Link copiado");
      setManualLink("");
    } catch {
      setManualLink(url.toString());
    }
  }

  function resetDemo() {
    const sample = initialDemo();
    sample.orders[0].status = "preparing";
    setDemo(sample);
    setSearch("");
    setFilter("all");
    setFeedback("Demonstração reiniciada");
    const url = new URL(window.location.href);
    url.searchParams.delete("pedido");
    window.history.replaceState(null, "", url);
  }

  function showFilter(status: Status | "active") {
    setSearch("");
    setFilter(status);
    document.getElementById("pedidos-recentes")?.scrollIntoView({ block: "nearest" });
  }

  const activeCount = demo.orders.filter(item => item.status !== "delivered").length;
  const matches = demo.orders.filter(item => {
    const inFilter = filter === "all" || (filter === "active" ? item.status !== "delivered" : item.status === filter);
    return inFilter && `${item.id} ${item.customer} ${item.courier} ${item.destination}`.toLowerCase().includes(search.trim().toLowerCase());
  });
  const customerHeadline = {
    preparing: "Seu pedido está em preparo.",
    on_route: "Seu pedido está a caminho.",
    arrived: "Seu pedido chegou!",
    delivered: "Seu pedido foi entregue.",
  }[order.status];
  const google = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=driving`;
  const apple = `https://maps.apple.com/?daddr=${destination.lat},${destination.lng}&dirflg=d`;

  if (!loaded) return <main className="trip"><p className="trip-main" role="status">Carregando demonstração…</p></main>;

  return <div className="trip">
    <header className="trip-header">
      <div className="trip-header-inner">
        <span className="trip-brand" aria-hidden="true"><img src="/redesign/route-symbol.webp" alt="" /></span>
        <nav aria-label="Perfis da demonstração" data-profile={view}>
          <span className="trip-glass-lens" aria-hidden="true"><span ref={lens} /></span>
          {(Object.keys(views) as View[]).map(profile => {
            const Icon = profileIcons[profile];
            return <button key={profile} type="button" aria-label={views[profile]}
              aria-current={view === profile ? "page" : undefined} onClick={() => switchView(profile)}>
              <Icon size={21} aria-hidden="true" />
              <span>{views[profile]}</span>
            </button>;
          })}
        </nav>
      </div>
    </header>
    <main className="trip-main">
      <div className="trip-heading">
        <div>
          <h1>{view === "merchant" ? "Pedidos" : view === "courier" ? "Minha entrega" : "Acompanhe seu pedido"}</h1>
          <p>{view === "merchant" ? "Pedidos, entregador e cliente no mesmo fluxo."
            : view === "courier" ? `Olá, ${order.courier}. Confira sua próxima etapa.` : `Pedido #${order.id}`}</p>
        </div>
        {view === "merchant" && <Pill onClick={() => setModal("create")}>Novo pedido <ArrowRight size={22} /></Pill>}
        {view === "courier" && <Pill onClick={() => setModal("navigation")}><span>Abrir navegação</span><ArrowRight size={22} /></Pill>}
      </div>
      {view === "merchant" && <>
        <div className="trip-merchant-grid">
          <section className="trip-hero trip-shop-hero">
            <div className="trip-hero-copy">
              <span className="trip-live-label">Entregas em andamento</span>
              <strong className="trip-count">{String(activeCount).padStart(2, "0")}</strong>
              <h2>Entregas em andamento</h2>
              <p>Acompanhe o preparo, a coleta e a rota das suas entregas.</p>
              <Pill onClick={() => showFilter("active")}>Ver detalhes <ArrowRight size={21} /></Pill>
            </div>
            <img className="trip-art" src="/redesign/packing.webp" alt="" />
          </section>
          <div className="trip-summary">
            {(["preparing", "on_route"] as const).map(status => {
              const Icon = statuses[status].icon;
              return <button key={status} type="button" className={`trip-summary-tile trip-${status}`}
                onClick={() => showFilter(status)}>
                <span className="trip-summary-icon"><Icon size={31} aria-hidden="true" /></span>
                <span className="trip-summary-copy"><strong>{statuses[status].label}</strong>
                  <span>{status === "preparing" ? "Pedidos sendo preparados no estabelecimento." : "Pedidos com o entregador a caminho do cliente."}</span></span>
                <span className="trip-summary-end"><strong>{String(demo.orders.filter(item => item.status === status).length).padStart(2, "0")}</strong>
                  <span><ArrowRight size={22} aria-hidden="true" /></span></span>
              </button>;
            })}
          </div>
        </div>
        <section className="trip-paper trip-orders" id="pedidos-recentes">
          <div className="trip-order-heading">
            <h2>Pedidos recentes</h2>
            <label className="trip-search"><Search size={19} aria-hidden="true" />
              <input type="search" aria-label="Buscar pedidos" placeholder="Buscar pedidos" value={search} onChange={event => setSearch(event.target.value)} />
            </label>
            <div className="trip-filters" role="group" aria-label="Filtrar pedidos por etapa">
              {(["all", ...stages] as const).map(status => <button key={status} type="button"
                aria-pressed={filter === status} onClick={() => setFilter(status)}>{status === "all" ? "Todos" : statuses[status].label}</button>)}
              {filter === "active" && <button type="button" aria-pressed="true" onClick={() => setFilter("all")}>Em andamento</button>}
            </div>
          </div>
          <div className="trip-table-head" aria-hidden="true"><span>Pedido</span><span>Cliente</span><span>Entregador</span><span>Status</span><span>Região</span></div>
          <ul className="trip-orders-list">
            {matches.map(item => <li key={item.id}><button type="button" className="trip-order-row" onClick={() => openOrder(item.id)}>
              <strong>#{item.id}</strong>
              <span className="trip-order-person"><UserRound size={21} aria-hidden="true" /><strong>{item.customer}</strong></span>
              <span className="trip-order-person trip-order-courier"><Bike size={20} aria-hidden="true" />{item.courier}</span>
              <span className="trip-order-status"><StatusBadge status={item.status} /></span>
              <span className="trip-order-region"><MapPin size={21} aria-hidden="true" />{item.destination}</span>
              <span className="trip-order-arrow"><ArrowRight size={18} aria-hidden="true" /></span>
            </button></li>)}
          </ul>
          {matches.length === 0 && <p className="trip-empty" role="status">Nenhum pedido encontrado.</p>}
        </section>
      </>}
      {view === "courier" && <div className="trip-courier-grid">
        <section className="trip-hero trip-courier-hero"><div className="trip-hero-copy">
          <StatusBadge status={order.status} withIcon />
          <p className="trip-order-number">Pedido #{order.id}</p>
          <h2>{order.customer}</h2>
          <p className="trip-address"><MapPin size={22} aria-hidden="true" /> {order.destination}</p>
        </div><img className="trip-art" src="/redesign/courier.webp" alt="" /></section>
        <section className="trip-paper trip-next">
          <h2>Próxima etapa</h2>
          <div className="trip-next-actions">
            {order.status === "preparing" && <Pill onClick={() => move({ status: "on_route", sharing: true, step: 0 })}>
              Iniciar viagem simulada <ArrowRight size={22} /></Pill>}
            {order.status === "on_route" && <Pill onClick={() => move({ status: "arrived", sharing: false, step: lastStep })}>
              Cheguei ao destino <ArrowRight size={22} /></Pill>}
            {order.status === "arrived" && <Pill onClick={() => move({ status: "delivered", sharing: false })}>
              Confirmar entrega concluída <Check size={20} /></Pill>}
            {order.status === "delivered" && <strong className="trip-complete"><Check size={22} /> Entrega concluída</strong>}
            <span className={order.ready ? "trip-ready" : "trip-waiting"}>{order.ready ? <Check size={20} /> : <UserRound size={20} />}
              {order.ready ? "Cliente pronto para receber" : "Aguardando confirmação do cliente"}</span>
          </div>
          {order.status === "on_route" && order.step < lastStep &&
            <button type="button" className="trip-text-button" onClick={() => move({ sharing: !order.sharing })}>
              {order.sharing ? <Pause size={16} /> : <Play size={16} />}
              {order.sharing ? "Pausar trajeto" : order.step ? "Continuar trajeto" : "Simular movimento"}
            </button>}
        </section>
        <IllustratedMap key={order.id} order={order} />
        <Timeline status={order.status} />
      </div>}
      {view === "customer" && <>
        <div className="trip-customer-grid">
          <section className="trip-hero trip-customer-hero"><div className="trip-hero-copy">
            <StatusBadge status={order.status} withIcon />
            <h2>{customerHeadline}</h2>
            <p>{order.status === "on_route" ? `${order.courier} está levando seu pedido.` :
              order.status === "arrived" ? `${order.courier} chegou ao destino.` :
                order.status === "delivered" ? "A entrega foi concluída." : "O estabelecimento confirmou seu pedido."}</p>
            {order.status !== "delivered" && <Pill disabled={order.ready} onClick={() => move({ ready: true })}>
              {order.ready ? <>Pronto confirmado <Check size={20} /></> : <>Estou pronto para receber <ArrowRight size={22} /></>}
            </Pill>}
          </div><img className="trip-art" src="/redesign/courier.webp" alt="" /></section>
          <IllustratedMap key={order.id} order={order} />
        </div>
        <Timeline status={order.status} title />
      </>}
      <footer className="trip-footer">
        <span>Dados fictícios salvos neste navegador.</span>
        <button type="button" onClick={resetDemo}><RefreshCw size={15} /> Reiniciar teste</button>
      </footer>
    </main>
    <dialog ref={dialog} className="trip-dialog" aria-labelledby="trip-dialog-title" onClose={() => setModal(null)}
      onClick={event => { if (event.target === event.currentTarget) setModal(null); }}>
      {modal && <div className="trip-dialog-body">
        <div className="trip-dialog-heading">
          <h2 id="trip-dialog-title">{modal === "create" ? "Novo pedido" : modal === "details" ? `Pedido #${order.id}` :
            "Abrir navegação"}</h2>
          <button className="trip-text-button" type="button" onClick={() => setModal(null)}>Fechar</button>
        </div>
        {modal === "create" && <form className="trip-form" onSubmit={createOrder}>
          <p>Use nomes fictícios para este pedido de demonstração.</p>
          <label>Cliente<input name="customer" required maxLength={90} /></label>
          <label>Entregador<input name="courier" required maxLength={90} /></label>
          <button className="trip-pill" type="submit">Criar pedido <ArrowRight size={20} /></button>
        </form>}
        {modal === "details" && <div className="trip-detail">
          <StatusBadge status={order.status} />
          <h3>{order.customer}</h3><p>{order.destination}</p><p>Entregador: {order.courier}</p>
          <p>{order.ready ? "Cliente pronto para receber" : "Aguardando confirmação do cliente"}</p>
          <div className="trip-detail-links">
            <Pill secondary onClick={() => void copyLink("courier")}><Clipboard size={17} /> Link do entregador</Pill>
            <Pill secondary onClick={() => void copyLink("customer")}><Clipboard size={17} /> Link do cliente</Pill>
          </div>
          {manualLink && <label className="trip-form">Copie o link<input readOnly value={manualLink} onFocus={event => event.currentTarget.select()} /></label>}
          <button type="button" className="trip-text-button" onClick={() => { setModal(null); switchView("customer"); }}>Ver acompanhamento <ArrowRight size={18} /></button>
        </div>}
        {modal === "navigation" && <div className="trip-detail">
          <p>O destino desta demonstração é ilustrativo.</p>
          <div className="trip-detail-links">
            <a className="trip-pill" href={wazeDirectionsUrl(destination) ?? undefined} target="_blank" rel="noreferrer"><Navigation size={19} /> Waze</a>
            <a className="trip-pill trip-secondary" href={google} target="_blank" rel="noreferrer">Google Maps</a>
            <a className="trip-pill trip-secondary" href={apple} target="_blank" rel="noreferrer">Apple Maps</a>
          </div>
        </div>}
      </div>}
    </dialog>
    {feedback && <div className="trip-toast" role="status"><Check size={18} /> {feedback}</div>}
  </div>;
}
