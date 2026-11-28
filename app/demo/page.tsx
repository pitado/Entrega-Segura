"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent, type ReactNode } from "react";
import {
  ArrowRight, Bike, Check, ChefHat, Clipboard, Gift, Lock, MapPin, Navigation,
  Package, Pause, Play, RefreshCw, Search, ShieldCheck, Truck, UserRound, Warehouse,
} from "lucide-react";
import { wazeDirectionsUrl } from "../../lib/navigation";
import "./demo.css";
import DeliveryTrackingMap from "./DeliveryTrackingMap";
import { PitouMark } from "../components/PitouLogo";
import Art from "../components/Art";
import Radar, { distanceText } from "../components/Radar";
import { pricing } from "../pricing";

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
  /** Código de entrega do Encontro: só o cliente vê; o entregador digita para concluir. */
  code: string;
  verified: boolean;
  failed: number;
};
type Demo = { orders: Order[]; selected: number };

const storageKey = "pitou-demo-v1";
// Demonstração salva antes da troca de marca: os pedidos são reaproveitados uma vez.
const legacyKey = "entrega-segura-test-trip-v3";
const priorKey = "entrega-segura-test-trip-v2";
// Cashback fictício creditado ao cliente em cada entrega concluída da demonstração.
const cashbackPerOrder = 4.5;
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const views: Record<View, string> = { merchant: "Estabelecimento", courier: "Entregador", customer: "Cliente" };
const profileIcons = { merchant: Warehouse, courier: Bike, customer: MapPin };
const profileOrder = Object.keys(views) as View[];
const mobileProfileBar = "(max-width: 580px)";
const animatedProfileBar = `${mobileProfileBar} and (prefers-reduced-motion: no-preference)`;
const glassTapMs = 300;

type ProfileDrag = {
  button: HTMLButtonElement;
  profile: View;
  pointerId: number;
  startX: number;
  startY: number;
  firstCenter: number;
  gap: number;
  dragging: boolean;
  nextIndex: number;
  drawnIndex: number;
  frame?: number;
};
const stages = Object.keys(statuses) as Status[];
// Coordinates on the illustrated map, independent of the geographic destination.
const schematic = [[22, 76], [29, 72], [34, 68], [42, 68], [49, 67], [51, 59],
  [53, 49], [62, 48], [65, 46], [67, 38], [76, 37], [84, 28]];
const lastStep = schematic.length - 1;
const destination = { lat: -23.42018, lng: -51.92776 };
const maxCodeAttempts = 5;
const releaseMeters = 300;

function randomCode() {
  const n = typeof crypto !== "undefined" && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : Math.floor(Math.random() * 1e9);
  return String(n % 10000).padStart(4, "0");
}

/** Distância simulada entre o entregador e o cliente, a partir do ponto do trajeto ilustrado. */
function demoDistance(order: Order): number | null {
  if (order.status === "arrived") return 18;
  if (order.status !== "on_route") return null;
  return Math.max(40, (lastStep - order.step) * 130);
}

function codeReleased(order: Order) {
  const d = demoDistance(order);
  return d != null && d <= releaseMeters;
}

function newOrder(id: number, customer: string, courier: string, status: Status = "preparing", region = "Região central, Maringá"): Order {
  return {
    id, customer, courier, status, destination: region, ready: false, sharing: false,
    step: status === "delivered" || status === "arrived" ? lastStep : 0, updatedAt: "",
    code: randomCode(), verified: status === "delivered", failed: 0,
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
    code: typeof input.code === "string" && /^\d{4}$/.test(input.code) ? input.code : fallback.code,
    verified: typeof input.verified === "boolean" ? input.verified : fallback.verified,
    failed: Math.max(0, Math.min(maxCodeAttempts, Math.trunc(Number(input.failed) || 0))),
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

function StatusBadge({ status, withIcon = false, verified = false }: { status: Status; withIcon?: boolean; verified?: boolean }) {
  const { icon: Icon, label } = statuses[status];
  const showShield = verified && status === "delivered";
  return <span className={`trip-status trip-${status}`} title={showShield ? "Entrega verificada com código" : undefined}>
    {showShield ? <ShieldCheck size={withIcon ? 23 : 16} aria-hidden="true" /> : withIcon && <Icon size={23} aria-hidden="true" />}{label}
  </span>;
}

/** Tela do cliente na chegada: radar de proximidade e o código que só ele vê. */
function CustomerEncontro({ order }: { order: Order }) {
  const d = demoDistance(order);
  return <section className="trip-paper trip-encontro" aria-label="Encontro com o entregador">
    <div className="trip-encontro-head"><b>{order.status === "arrived" ? `${order.courier} chegou` : `${order.courier} está chegando`}</b>
      <span>· Pedido #{order.id}</span></div>
    <p className="trip-encontro-distance">{d != null && d < 30 ? "Menos de 30 m" : `A ${distanceText(d)} de você`}</p>
    <div className="trip-encontro-grid">
      <div className="trip-radar-box"><Radar distance={d} dotLabel={order.courier} /></div>
      <div className="trip-code">
        <h3>Seu código de entrega</h3>
        <span className="trip-code-chip"><ShieldCheck size={15} aria-hidden="true" /> Só para o entregador</span>
        <div className="trip-code-digits" aria-label={`Código ${order.code.split("").join(" ")}`}>
          {order.code.split("").map((digit, i) => <span key={i} aria-hidden="true">{digit}</span>)}
        </div>
        <p><b>Diga o código só quando {order.courier} estiver na sua frente.</b></p>
        <p className="trip-code-note">O Pitou nunca pede esse código por mensagem ou ligação.</p>
      </div>
    </div>
  </section>;
}

/** Tela do entregador: radar até o cliente e campo para digitar o código. */
function CourierEncontro({ order, onDeliver, onFail }: { order: Order; onDeliver: () => void; onFail: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const d = demoDistance(order);
  const left = maxCodeAttempts - order.failed;
  const step = order.status === "arrived" ? 3 : 2;
  function submit() {
    if (code.length !== 4) return;
    if (code === order.code) { setError(""); onDeliver(); return; }
    onFail();
    setCode("");
    const rest = left - 1;
    setError(rest > 0 ? `Código incorreto. Confira com o cliente (${rest} tentativa${rest === 1 ? "" : "s"} restante${rest === 1 ? "" : "s"}).` : "");
  }
  return <section className="trip-paper trip-encontro" aria-label="Encontro com o cliente">
    <div className="trip-encontro-head"><b>{order.status === "arrived" ? "No destino" : "Em rota"}</b><span>#{order.id} · Etapa {step} de 4</span></div>
    <p className="trip-encontro-distance">{d != null && d < 30 ? "Menos de 30 m" : distanceText(d).replace(/^m/, "M")}</p>
    <div className="trip-encontro-grid">
      <div className="trip-radar-box"><Radar distance={d} centerLabel={order.customer.split(" ")[0]} dotLabel="Você" /></div>
      <div className="trip-code trip-code-soft">
        <h3>Código de entrega</h3>
        {left <= 0 ? <p><Lock size={16} aria-hidden="true" /> <b>Muitas tentativas com o código errado.</b> Peça ao estabelecimento para concluir a entrega.</p> : <>
          <label className="trip-code-digits">
            {[0, 1, 2, 3].map(i => <span key={i} aria-hidden="true" data-filled={code[i] ? "" : undefined} data-cursor={i === Math.min(code.length, 3) ? "" : undefined}>{code[i] ?? ""}</span>)}
            <input value={code} inputMode="numeric" autoComplete="one-time-code" maxLength={4} aria-label="Código de entrega de 4 dígitos"
              onChange={event => { setCode(event.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
              onKeyDown={event => { if (event.key === "Enter") submit(); }} />
          </label>
          {error ? <p className="trip-code-error" role="alert">{error}</p> : <p>Peça o código ao cliente, pessoalmente.</p>}
          <p className="trip-code-note">Na demonstração, o código aparece na aba Cliente.</p>
          <button type="button" className="trip-pill trip-code-submit" disabled={code.length !== 4} onClick={submit}><Check size={20} /> Concluir entrega</button>
        </>}
      </div>
    </div>
  </section>;
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

function ProfileGlyph({ profile }: { profile: View }) {
  const Icon = profileIcons[profile];
  return <><Icon size={21} aria-hidden="true" /><span>{views[profile]}</span></>;
}

function ProfileNavigation({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const [pressed, setPressed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [target, setTarget] = useState<{ view: View; duration: number } | null>(null);
  const gesture = useRef<ProfileDrag | null>(null);
  const ignoreClick = useRef(false);
  const settleTimer = useRef<number | undefined>(undefined);

  const changeView = useRef(onChange);
  useEffect(() => { changeView.current = onChange; }, [onChange]);
  useEffect(() => {
    setTarget(null);
    return () => window.clearTimeout(settleTimer.current);
  }, [view]);
  useEffect(() => () => {
    if (gesture.current?.frame !== undefined) window.cancelAnimationFrame(gesture.current.frame);
  }, []);

  function selectProfile(next: View) {
    window.clearTimeout(settleTimer.current);
    setTarget(null);
    if (next !== view) changeView.current(next);
  }

  function settleLens(next: View, duration: number) {
    window.clearTimeout(settleTimer.current);
    setTarget({ view: next, duration });
    settleTimer.current = window.setTimeout(() => selectProfile(next), duration + 40);
  }

  function positionAt(x: number, drag: ProfileDrag) {
    return Math.max(0, Math.min(profileOrder.length - 1, (x - drag.firstCenter) / drag.gap));
  }

  function startGesture(event: PointerEvent<HTMLElement>) {
    if (!event.isPrimary || event.button !== 0 || !(event.target instanceof Element)) return;
    const button = event.target.closest("button");
    if (!button) return;

    ignoreClick.current = false;
    if (!window.matchMedia(mobileProfileBar).matches) return;

    const buttons = Array.from(event.currentTarget.querySelectorAll("button"));
    const [first, second] = buttons.map(button => button.getBoundingClientRect());
    const gap = second.left - first.left;
    if (gap <= 0) return;

    gesture.current = {
      button,
      profile: profileOrder[buttons.indexOf(button)],
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      firstCenter: first.left + first.width / 2,
      gap,
      dragging: false,
      nextIndex: 0,
      drawnIndex: 0,
    };
    setPressed(true);
  }

  function dragGesture(event: PointerEvent<HTMLElement>) {
    const drag = gesture.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const bar = event.currentTarget;
    drag.nextIndex = positionAt(event.clientX, drag);
    if (!drag.dragging) {
      const horizontal = Math.abs(event.clientX - drag.startX);
      if (horizontal < 6 || horizontal <= Math.abs(event.clientY - drag.startY)) return;
      drag.dragging = true;
      drag.drawnIndex = drag.nextIndex;
      bar.style.setProperty("--glass-drag-index", String(drag.drawnIndex));
      window.clearTimeout(settleTimer.current);
      setTarget(null);
      setDragging(true);
      bar.setPointerCapture(event.pointerId);
      return;
    }
    if (drag.frame === undefined) {
      drag.frame = window.requestAnimationFrame(() => {
        drag.frame = undefined;
        drag.drawnIndex = drag.nextIndex;
        bar.style.setProperty("--glass-drag-index", String(drag.drawnIndex));
      });
    }
  }

  function endGesture(event: PointerEvent<HTMLElement>, cancelled = false) {
    const drag = gesture.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    gesture.current = null;
    setPressed(false);
    if (!drag.dragging) {
      if (!cancelled && event.pointerType === "touch" &&
        drag.button.contains(document.elementFromPoint(event.clientX, event.clientY))) {
        // A quick tap after a swipe can end without a synthesized click.
        ignoreClick.current = true;
        select(drag.profile, true);
      }
      return;
    }

    if (drag.frame !== undefined) window.cancelAnimationFrame(drag.frame);
    setDragging(false);
    if (!cancelled) ignoreClick.current = true;
    const next = cancelled ? view : profileOrder[Math.round(positionAt(event.clientX, drag))];
    const remaining = Math.abs(profileOrder.indexOf(next) - drag.drawnIndex);
    if (remaining * drag.gap <= 2 || !window.matchMedia(animatedProfileBar).matches) {
      selectProfile(next);
    } else {
      settleLens(next, Math.min(240, 85 + Math.round(remaining * 170)));
    }
  }

  function select(next: View, pointer: boolean) {
    if (pointer && window.matchMedia(animatedProfileBar).matches) {
      const current = target?.view ?? view;
      if (next === current) return;
      const steps = Math.abs(profileOrder.indexOf(next) - profileOrder.indexOf(current));
      settleLens(next, glassTapMs + (steps - 1) * 60);
    } else {
      selectProfile(next);
    }
  }

  const optical = pressed || target !== null;
  const lensIndex = profileOrder.indexOf(target?.view ?? view);
  return <nav aria-label="Perfis da demonstração" data-profile={view}
    data-optical={optical || undefined} data-dragging={dragging || undefined}
    style={{ "--glass-index": lensIndex, "--glass-duration": `${target?.duration ?? glassTapMs}ms` } as CSSProperties}
    onPointerDown={startGesture}
    onPointerMove={dragGesture}
    onPointerUp={endGesture}
    onPointerCancel={event => endGesture(event, true)}
    onLostPointerCapture={event => {
      // Touch starts with implicit capture on the pressed icon or button.
      // Its loss is expected when the navigation takes over the drag.
      if (event.target === event.currentTarget) endGesture(event, true);
    }}
    onPointerLeave={event => {
      if (!gesture.current?.dragging) endGesture(event, true);
    }}
    onClickCapture={event => {
      const touchClick = "pointerType" in event.nativeEvent && event.nativeEvent.pointerType === "touch";
      if (ignoreClick.current && (event.detail > 0 || touchClick)) {
        ignoreClick.current = false;
        event.stopPropagation();
      }
    }}>
    <span className="trip-glass-lens" aria-hidden="true" onTransitionEnd={event => {
      if (event.target === event.currentTarget && event.propertyName === "transform" && target !== null) {
        selectProfile(target.view);
      }
    }}>
      <span className="trip-glass-shell">
        <span className="trip-glass-optics">
          {profileOrder.map(profile => <span className="trip-glass-glyph" key={profile}>
            <ProfileGlyph profile={profile} />
          </span>)}
        </span>
      </span>
    </span>
    {profileOrder.map(profile => <button key={profile} type="button"
      aria-current={view === profile ? "page" : undefined} onClick={event => select(profile, event.detail > 0)}>
      <ProfileGlyph profile={profile} />
    </button>)}
  </nav>;
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
      setDemo(readLocation(readDemo(localStorage.getItem(storageKey) ?? localStorage.getItem(legacyKey), localStorage.getItem(priorKey))));
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
    if (next !== view) window.scrollTo({ top: 0, behavior: "instant" });
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
  const deliveredCount = demo.orders.length - activeCount;
  const couriers = Array.from(new Set(demo.orders.map(item => item.courier)));
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
        <a className="trip-brand" href="/" aria-label="Pitou, página inicial"><PitouMark size={60} /><span className="trip-brand-name">pitou</span></a>
        <ProfileNavigation view={view} onChange={switchView} />
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
            <Art name="box" className="trip-art trip-art-box" label={false} />
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
        <div className="trip-plan-grid">
          <section className="trip-paper trip-plan-card" aria-labelledby="trip-team-title">
            <span className="trip-plan-icon trip-plan-team"><Bike size={24} aria-hidden="true" /></span>
            <div>
              <h2 id="trip-team-title">Entregadores</h2>
              <p><strong>{couriers.length} de {pricing.includedCouriers}</strong> incluídos no plano</p>
              <ul className="trip-team">{couriers.map(name => <li key={name}>{name}</li>)}</ul>
            </div>
          </section>
          <section className="trip-paper trip-plan-card" aria-labelledby="trip-cashback-title">
            <span className="trip-plan-icon trip-plan-cashback"><Gift size={24} aria-hidden="true" /></span>
            <div>
              <h2 id="trip-cashback-title">Cashback</h2>
              <p><strong>{brl.format(deliveredCount * cashbackPerOrder)}</strong> em créditos para {deliveredCount} cliente{deliveredCount === 1 ? "" : "s"}</p>
              <p className="trip-plan-note">Cada entrega concluída devolve {brl.format(cashbackPerOrder)} para a próxima compra.</p>
            </div>
          </section>
        </div>
        <section className="trip-paper trip-orders" id="pedidos-recentes">
          <div className="trip-order-heading">
            <h2>Pedidos e histórico</h2>
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
              <span className="trip-order-status"><StatusBadge status={item.status} verified={item.verified} /></span>
              <span className="trip-order-region"><MapPin size={21} aria-hidden="true" />{item.destination}</span>
              <span className="trip-order-arrow"><ArrowRight size={18} aria-hidden="true" /></span>
            </button></li>)}
          </ul>
          {matches.length === 0 && <p className="trip-empty" role="status">Nenhum pedido encontrado.</p>}
        </section>
      </>}
      {view === "courier" && (order.status === "on_route" || order.status === "arrived") &&
        <CourierEncontro key={order.id} order={order} onDeliver={() => { move({ status: "delivered", sharing: false, verified: true }); setFeedback("Código confirmado. Entrega verificada!"); }}
          onFail={() => move({ failed: order.failed + 1 })} />}
      {view === "courier" && <div className="trip-courier-grid">
        <section className="trip-hero trip-courier-hero"><div className="trip-hero-copy">
          <StatusBadge status={order.status} withIcon />
          <p className="trip-order-number">Pedido #{order.id}</p>
          <h2>{order.customer}</h2>
          <p className="trip-address"><MapPin size={22} aria-hidden="true" /> {order.destination}</p>
        </div><Art name="moto" className="trip-art trip-art-box" label={false} /></section>
        <section className="trip-paper trip-next">
          <h2>Próxima etapa</h2>
          <div className="trip-next-actions">
            {order.status === "preparing" && <Pill onClick={() => move({ status: "on_route", sharing: true, step: 0 })}>
              Iniciar viagem simulada <ArrowRight size={22} /></Pill>}
            {order.status === "on_route" && <Pill onClick={() => move({ status: "arrived", sharing: false, step: lastStep })}>
              Cheguei ao destino <ArrowRight size={22} /></Pill>}
            {order.status === "arrived" && <strong className="trip-waiting"><Lock size={20} /> Digite o código do cliente para concluir</strong>}
            {order.status === "delivered" && <strong className="trip-complete">{order.verified ? <ShieldCheck size={22} /> : <Check size={22} />} {order.verified ? "Entrega verificada" : "Entrega concluída"}</strong>}
            <span className={order.ready ? "trip-ready" : "trip-waiting"}>{order.ready ? <Check size={20} /> : <UserRound size={20} />}
              {order.ready ? "Cliente pronto para receber" : "Aguardando confirmação do cliente"}</span>
          </div>
          {order.status === "on_route" && order.step < lastStep &&
            <button type="button" className="trip-text-button" onClick={() => move({ sharing: !order.sharing })}>
              {order.sharing ? <Pause size={16} /> : <Play size={16} />}
              {order.sharing ? "Pausar trajeto" : order.step ? "Continuar trajeto" : "Simular movimento"}
            </button>}
        </section>
        <DeliveryTrackingMap key={order.id} orderId={order.id} status={order.status} step={order.step} destinationLabel={order.destination}>
          <Timeline status={order.status} />
        </DeliveryTrackingMap>
      </div>}
      {view === "customer" && <>
        {order.status !== "delivered" && codeReleased(order) && <CustomerEncontro order={order} />}
        {order.status === "on_route" && !codeReleased(order) && <div className="trip-code-locked"><Lock size={22} aria-hidden="true" />
          <span><b>Código de entrega</b>Liberado quando {order.courier} estiver chegando. Ele garante que o pedido é entregue a você.</span></div>}
        <div className="trip-customer-grid">
          <section className="trip-hero trip-customer-hero">
            <div className="trip-hero-copy">
              <StatusBadge status={order.status} withIcon />
              <h2>{customerHeadline}</h2>
              <p>{order.status === "on_route" ? `${order.courier} está levando seu pedido.` :
                order.status === "arrived" ? `${order.courier} chegou ao destino.` :
                  order.status === "delivered" ? "A entrega foi concluída." : "O estabelecimento confirmou seu pedido."}</p>
              {order.status === "delivered" && order.verified && <p className="trip-verified"><ShieldCheck size={18} aria-hidden="true" /> Entrega verificada com o seu código</p>}
              <p className="trip-cashback-note"><Gift size={20} aria-hidden="true" />
                {order.status === "delivered" ? <span>Você ganhou <strong>{brl.format(cashbackPerOrder)}</strong> de cashback para o próximo pedido.</span>
                  : <span>Ao receber, você ganha <strong>{brl.format(cashbackPerOrder)}</strong> de cashback.</span>}</p>
            </div>
            <Art name="burger" className="trip-customer-art" label={false} />
            {order.status !== "delivered" && <Pill disabled={order.ready} onClick={() => move({ ready: true })}>
              {order.ready ? <>Pronto confirmado <Check size={20} /></> : <>Estou pronto para receber <ArrowRight size={22} /></>}
            </Pill>}
          </section>
          <DeliveryTrackingMap key={order.id} orderId={order.id} status={order.status} step={order.step} destinationLabel={order.destination}>
            <Timeline status={order.status} title />
          </DeliveryTrackingMap>
        </div>
      </>}
      <footer className="trip-footer">
        <span>Dados fictícios salvos neste navegador.</span>
        <a href="/#precos">Conheça os planos do Pitou</a>
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
          <StatusBadge status={order.status} verified={order.verified} />
          <h3>{order.customer}</h3><p>{order.destination}</p><p>Entregador: {order.courier}</p>
          {order.status === "delivered" && <p>{order.verified ? "Entrega verificada: o cliente informou o código." : "Concluída sem o código de entrega."}</p>}
          {(order.status === "on_route" || order.status === "arrived") && <>
            <p>Entrega com código: o entregador conclui digitando o código que só o cliente vê.{order.failed ? ` ${order.failed} tentativa${order.failed === 1 ? "" : "s"} errada${order.failed === 1 ? "" : "s"}.` : ""}</p>
            <button type="button" className="trip-text-button" onClick={() => { move({ status: "delivered", sharing: false, verified: false }); setModal(null); setFeedback("Entrega concluída pelo estabelecimento"); }}>
              Concluir sem o código <Check size={16} /></button>
          </>}
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
