"use client";

import { useCallback, useEffect, useState } from "react";
import { Gift, LocateFixed, MenuSquare, Phone } from "lucide-react";
import LiveMap from "../../components/LiveMap";
import PitouLogo from "../../components/PitouLogo";
import { api, brl, phone, statusLabel, time, toPoint } from "../../components/client";

type Order = {
  number: number | null; status: "preparing" | "on_route" | "arrived" | "delivered" | "cancelled"; destination: string;
  destination_latitude: number | null; destination_longitude: number | null; customer_ready: boolean; created_at: string;
  delivered_at: string | null; customer_name: string; total_amount: number | null; cashback_used: number; cashback_earned: number;
  courier_name: string | null; establishment_name: string; logo_url: string | null; establishment_phone: string | null;
  slug: string | null; menu_enabled: boolean; cashback_percent: number; establishment_latitude: number | null; establishment_longitude: number | null;
  cashback_balance: number | null; latitude: number | null; longitude: number | null; recorded_at: string | null;
};
type Update = { status: string; created_at: string };
const steps = ["preparing", "on_route", "arrived", "delivered"] as const;
const headline: Record<Order["status"], string> = {
  preparing: "Seu pedido está sendo preparado",
  on_route: "Seu pedido saiu para entrega",
  arrived: "O entregador chegou",
  delivered: "Pedido entregue",
  cancelled: "Pedido cancelado",
};

export default function Tracking({ token }: { token: string }) {
  const base = `/api/tracking/${token}`;
  const [order, setOrder] = useState<Order | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await api<{ order: Order; updates: Update[] }>(base);
      setOrder(r.order); setUpdates(r.updates); setError("");
    } catch (err) { setError((err as Error).message); }
  }, [base]);

  useEffect(() => {
    load();
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function ready() {
    setBusy(true);
    try { await api(base, { body: { action: "ready" } }); await load(); } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  function shareLocation() {
    if (!navigator.geolocation) { setNotice("Seu navegador não informa a localização."); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async p => {
      try {
        await api(base, { body: { action: "destination", latitude: p.coords.latitude, longitude: p.coords.longitude } });
        setNotice("Localização confirmada. Obrigado!");
        await load();
      } catch (err) { setNotice((err as Error).message); }
      finally { setBusy(false); }
    }, () => { setNotice("Não foi possível obter sua localização. Verifique a permissão do navegador."); setBusy(false); }, { enableHighAccuracy: true, timeout: 15000 });
  }

  if (!order) return <main className="pt"><div className="pt-narrow">
    <PitouLogo size={36} />
    {error ? <p className="pt-error" role="alert">{error}</p> : <p className="pt-muted">Carregando sua entrega…</p>}
  </div></main>;

  const courier = toPoint(order.latitude, order.longitude);
  const destination = toPoint(order.destination_latitude, order.destination_longitude);
  const store = toPoint(order.establishment_latitude, order.establishment_longitude);
  const active = order.status === "preparing" || order.status === "on_route" || order.status === "arrived";
  const stepIndex = steps.indexOf(order.status as (typeof steps)[number]);
  const potential = order.total_amount != null && order.cashback_percent > 0 ? Math.round((order.total_amount - order.cashback_used) * order.cashback_percent) / 100 : 0;

  return <main className="pt"><div className="pt-narrow">
    <div className="pt-brand-head">
      {order.logo_url && <img src={order.logo_url} alt="" />}
      <div className="pt-grow"><h3>{order.establishment_name}</h3><p className="pt-small pt-muted">Pedido {order.number ? "#" + order.number : ""} · {time(order.created_at)}</p></div>
      {order.establishment_phone && <a className="pt-icon-btn" href={"tel:" + order.establishment_phone} aria-label={"Ligar para " + phone(order.establishment_phone)}><Phone size={18} /></a>}
    </div>

    <div className="pt-card pt-stack">
      <h1>{headline[order.status]}</h1>
      {order.status !== "cancelled" && <div className="pt-steps" aria-label="Etapas da entrega">
        {steps.map((s, i) => <div key={s} className={"pt-step" + (i <= stepIndex ? " done" : "")}><i />{statusLabel[s]}</div>)}
      </div>}
      {order.courier_name && active && order.status !== "preparing" && <p className="pt-muted">{order.courier_name} está levando o seu pedido.</p>}
      {order.status === "delivered" && order.delivered_at && <p className="pt-muted">Entregue às {time(order.delivered_at)}. Bom apetite!</p>}
    </div>

    {active && order.status !== "preparing" && <LiveMap courier={courier} destination={destination} routeToken={token}
      emptyText="Assim que o GPS do entregador estiver ativo, ele aparece aqui." />}
    {active && order.status === "preparing" && store && <LiveMap store={store} destination={destination} height={220} />}

    {active && <div className="pt-card pt-stack">
      {!destination && <>
        <p className="pt-small pt-muted">Confirme onde você está para o entregador chegar mais rápido e para ver a previsão de chegada.</p>
        <button className="pt-btn pt-btn-light" disabled={busy} onClick={shareLocation}><LocateFixed size={17} /> Confirmar minha localização</button>
      </>}
      {order.status !== "preparing" && (order.customer_ready
        ? <p className="pt-success">Você avisou que está pronto para receber.</p>
        : <button className="pt-btn pt-btn-green" disabled={busy} onClick={ready}>Estou pronto para receber</button>)}
      {notice && <p className="pt-notice">{notice}</p>}
      <p className="pt-small pt-muted">Entregar em: {order.destination}</p>
    </div>}

    {(order.cashback_percent > 0 || order.cashback_earned > 0) && <div className="pt-cashback">
      <span className="pt-row" style={{ fontWeight: 700 }}><Gift size={18} /> Cashback {order.establishment_name}</span>
      {order.status === "delivered" && order.cashback_earned > 0
        ? <><b>+{brl(order.cashback_earned)}</b><span>creditados neste pedido.</span></>
        : active && potential > 0 ? <><b>{brl(potential)}</b><span>de volta quando este pedido for entregue ({order.cashback_percent.toLocaleString("pt-BR")}%).</span></>
        : <span>Ganhe {order.cashback_percent.toLocaleString("pt-BR")}% de volta nos próximos pedidos.</span>}
      {order.cashback_balance != null && <span className="pt-small">Seu saldo: <b style={{ fontSize: 14 }}>{brl(order.cashback_balance)}</b> para usar no próximo pedido.</span>}
    </div>}

    {order.menu_enabled && order.slug && <a className="pt-btn pt-btn-light" href={`/m/${order.slug}`}><MenuSquare size={17} /> Ver o cardápio</a>}

    {updates.length > 0 && <details className="pt-card">
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>Histórico da entrega</summary>
      <ol className="pt-timeline" style={{ marginTop: 12 }}>
        {updates.map((u, i) => <li key={i}><time>{time(u.created_at)}</time><span>{statusLabel[u.status] || u.status}</span></li>)}
      </ol>
    </details>}
    <p className="pt-footer-note">Entrega acompanhada por <a href="/" aria-label="Pitou"><span className="pitou-logo"><span className="pitou-wordmark">pitou</span></span></a></p>
  </div></main>;
}
