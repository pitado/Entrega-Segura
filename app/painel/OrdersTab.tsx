"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Check, Copy, MessageCircle, Plus, X } from "lucide-react";
import LiveMap from "../components/LiveMap";
import { actorLabel, api, brl, phone, statusLabel, time, toPoint, whatsappUrl } from "../components/client";
import type { Order, Overview } from "./types";

type Props = { data: Overview; refresh: () => Promise<void>; goTo: (tab: "entregadores") => void };
const active = (o: Order) => o.status === "preparing" || o.status === "on_route" || o.status === "arrived";
const trackingUrl = (o: Order) => (typeof window === "undefined" ? "" : location.origin) + "/acompanhar/" + o.tracking_token;

export default function OrdersTab({ data, refresh, goTo }: Props) {
  const { orders, today, couriers, establishment } = data;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<Order | null>(null);
  const activeOrders = orders.filter(active);
  const finished = orders.filter(o => !active(o));
  const selected = orders.find(o => o.id === selectedId) || activeOrders[0] || finished[0] || null;
  const activeCouriers = couriers.filter(c => c.active);

  return <>
    <div className="pt-stats">
      <div className="pt-stat"><b>{today.active}</b><span>Em andamento</span></div>
      <div className="pt-stat"><b>{today.delivered}</b><span>Entregues hoje</span></div>
      <div className="pt-stat"><b>{brl(today.revenue)}</b><span>Vendido hoje</span></div>
      <div className="pt-stat"><b>{brl(today.cashback)}</b><span>Cashback gerado hoje</span></div>
      <div className="pt-stat"><b>{today.avg_minutes != null ? today.avg_minutes + " min" : "–"}</b><span>Tempo médio de entrega</span></div>
    </div>
    {activeCouriers.length === 0 && <div className="pt-notice pt-between">
      <span>Cadastre seus entregadores para começar a enviar pedidos.</span>
      <button className="pt-btn pt-btn-sm" onClick={() => goTo("entregadores")}>Cadastrar entregadores</button>
    </div>}
    <div className="pt-orders">
      <div className="pt-order-list">
        <button className="pt-btn pt-btn-block" onClick={() => setCreating(true)}><Plus size={18} aria-hidden="true" /> Novo pedido</button>
        <p className="pt-section-label">Em andamento ({activeOrders.length})</p>
        {activeOrders.length === 0 && <div className="pt-card pt-empty">Nenhuma entrega em andamento.</div>}
        {activeOrders.map(o => <OrderItem key={o.id} order={o} current={selected?.id === o.id} onClick={() => setSelectedId(o.id)} />)}
        {finished.length > 0 && <p className="pt-section-label">Finalizados nas últimas 12 horas</p>}
        {finished.map(o => <OrderItem key={o.id} order={o} current={selected?.id === o.id} onClick={() => setSelectedId(o.id)} />)}
      </div>
      {selected ? <OrderDetail key={selected.id} order={selected} data={data} refresh={refresh} />
        : <div className="pt-card pt-empty"><b>Nenhum pedido ainda</b><span>Crie o primeiro pedido para acompanhar a entrega em tempo real.</span></div>}
    </div>
    {creating && <NewOrderDialog data={data} onClose={() => setCreating(false)} onCreated={async id => {
      setCreating(false);
      await refresh();
      setSelectedId(id);
      setCreated({ id } as Order);
    }} />}
    {created && <CreatedDialog order={orders.find(o => o.id === created.id) || null} establishmentName={establishment.name} onClose={() => setCreated(null)} />}
  </>;
}

function OrderItem({ order: o, current, onClick }: { order: Order; current: boolean; onClick: () => void }) {
  return <button className="pt-order-item" aria-current={current} onClick={onClick}>
    <div className="pt-between">
      <span className="pt-order-title">{o.number ? `#${o.number} · ` : ""}{o.customer_name}</span>
      <span className={"pt-badge " + o.status}>{statusLabel[o.status]}</span>
    </div>
    <span className="pt-order-address">{o.destination}</span>
    <span className="pt-row pt-small pt-muted">
      <span>{time(o.created_at)}</span>
      <span>{o.courier_name ? "· " + o.courier_name : "· sem entregador"}</span>
      {o.total_amount != null && <span>· {brl(o.total_amount)}</span>}
      {o.customer_ready && active(o) && <span style={{ color: "var(--green-strong)", fontWeight: 700 }}>· cliente pronto</span>}
    </span>
  </button>;
}

function OrderDetail({ order: o, data, refresh }: { order: Order; data: Overview; refresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [updates, setUpdates] = useState<{ status: string; actor_type: string; created_at: string }[]>([]);
  const e = data.establishment;
  const courierPoint = toPoint(o.latitude, o.longitude);
  const destination = toPoint(o.destination_latitude, o.destination_longitude);
  const store = toPoint(e.latitude, e.longitude);
  const isActive = active(o);
  const url = trackingUrl(o);
  const gpsAge = o.location_at ? Math.round((Date.now() - new Date(o.location_at).getTime()) / 1000) : null;

  useEffect(() => {
    api<{ updates: typeof updates }>(`/api/painel/orders/${o.id}`).then(r => setUpdates(r.updates)).catch(() => {});
  }, [o.id, o.updated_at, o.status, o.customer_ready]);

  async function act(body: Record<string, unknown>) {
    setBusy(true); setError("");
    try { await api(`/api/painel/orders/${o.id}`, { method: "PATCH", body }); await refresh(); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); setConfirmCancel(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* sem permissão */ }
  }

  return <section className="pt-detail" aria-label="Detalhes do pedido">
    <div className="pt-card pt-stack">
      <div className="pt-between">
        <h2>{o.number ? `Pedido #${o.number}` : "Pedido"} · {o.customer_name}</h2>
        <span className={"pt-badge " + o.status}>{statusLabel[o.status]}</span>
      </div>
      {isActive && <LiveMap courier={o.status !== "preparing" ? courierPoint : null} destination={destination} store={store}
        routeToken={o.status !== "preparing" ? o.tracking_token : null}
        emptyText={o.status === "preparing" ? "O mapa aparece quando o entregador sair com o pedido." : "Aguardando o GPS do entregador. Peça para ele abrir o link e tocar em Compartilhar localização."} />}
      {isActive && o.status !== "preparing" && <p className="pt-small pt-muted">
        {courierPoint ? `GPS do entregador atualizado há ${gpsAge}s.` : "O entregador ainda não está compartilhando a localização."}
        {!destination && " O cliente ainda não confirmou a localização no link, então a previsão de chegada pode não aparecer."}
      </p>}
      {o.customer_ready && isActive && <p className="pt-success">O cliente avisou que está pronto para receber.</p>}
      <dl className="pt-kv">
        <dt>Endereço</dt><dd>{o.destination}</dd>
        {o.customer_phone && <><dt>Telefone</dt><dd><a href={"tel:" + o.customer_phone}>{phone(o.customer_phone)}</a></dd></>}
        {o.total_amount != null && <><dt>Valor</dt><dd>{brl(o.total_amount)}{o.cashback_used > 0 && ` (cliente usou ${brl(o.cashback_used)} de cashback, cobrar ${brl(o.total_amount - o.cashback_used)})`}</dd></>}
        {o.status === "delivered" && o.cashback_earned > 0 && <><dt>Cashback</dt><dd>{brl(o.cashback_earned)} creditado ao cliente</dd></>}
        {o.notes && <><dt>Observações</dt><dd>{o.notes}</dd></>}
        <dt>Criado</dt><dd>{time(o.created_at)}</dd>
      </dl>
      {o.status === "preparing" ? <label className="pt-field"><span>Entregador</span>
        <select value={o.courier_id || ""} disabled={busy} onChange={ev => act({ action: "assign", courier_id: ev.target.value || null })}>
          <option value="">Escolha o entregador</option>
          {data.couriers.filter(c => c.active).map(c => <option key={c.id} value={c.id}>{c.name}{c.active_orders ? ` (${c.active_orders} em andamento)` : ""}</option>)}
        </select></label>
        : <dl className="pt-kv"><dt>Entregador</dt><dd>{o.courier_name || "–"}</dd></dl>}
      {error && <p className="pt-error" role="alert">{error}</p>}
      {isActive && <div className="pt-row">
        {o.status === "preparing" && <button className="pt-btn" disabled={busy || !o.courier_id} onClick={() => act({ action: "status", status: "on_route" })}>Saiu para entrega</button>}
        {o.status === "on_route" && <button className="pt-btn pt-btn-light" disabled={busy} onClick={() => act({ action: "status", status: "arrived" })}>Chegou ao destino</button>}
        {o.status !== "preparing" && <button className="pt-btn pt-btn-green" disabled={busy} onClick={() => act({ action: "status", status: "delivered" })}><Check size={17} aria-hidden="true" /> Marcar como entregue</button>}
        {!confirmCancel ? <button className="pt-btn pt-btn-danger" disabled={busy} onClick={() => setConfirmCancel(true)}>Cancelar pedido</button>
          : <><button className="pt-btn pt-btn-danger" disabled={busy} onClick={() => act({ action: "status", status: "cancelled" })}>Confirmar cancelamento</button>
            <button className="pt-btn pt-btn-light" onClick={() => setConfirmCancel(false)}>Voltar</button></>}
      </div>}
    </div>
    {isActive && <div className="pt-card pt-stack">
      <h3>Link de acompanhamento do cliente</h3>
      <div className="pt-copy">
        <input className="pt-input" readOnly value={url} aria-label="Link do cliente" onFocus={ev => ev.currentTarget.select()} />
        <button className="pt-btn pt-btn-light pt-btn-sm" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copiado" : "Copiar"}</button>
      </div>
      {o.customer_phone && <a className="pt-btn pt-btn-blue" target="_blank" rel="noreferrer"
        href={whatsappUrl(o.customer_phone, `Olá, ${o.customer_name}! Acompanhe seu pedido de ${e.name} em tempo real: ${url}`)}>
        <MessageCircle size={17} aria-hidden="true" /> Enviar pelo WhatsApp</a>}
    </div>}
    {updates.length > 0 && <div className="pt-card pt-stack">
      <h3>Linha do tempo</h3>
      <ol className="pt-timeline">
        {updates.map((u, i) => <li key={i}><time>{time(u.created_at)}</time><span>{statusLabel[u.status] || u.status} <span className="pt-muted">· {actorLabel[u.actor_type] || u.actor_type}</span></span></li>)}
      </ol>
    </div>}
  </section>;
}

function NewOrderDialog({ data, onClose, onCreated }: { data: Overview; onClose: () => void; onCreated: (id: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [customer, setCustomer] = useState<{ name: string | null; cashback_balance: number } | null>(null);
  const [name, setName] = useState("");
  const [total, setTotal] = useState("");
  const [useCashback, setUseCashback] = useState(false);
  const pct = data.establishment.cashback_percent;
  const totalNumber = Number(total.replace(",", ".")) || 0;
  const cashbackToUse = useMemo(() => customer && useCashback ? Math.min(customer.cashback_balance, totalNumber) : 0, [customer, useCashback, totalNumber]);

  useEffect(() => { ref.current?.showModal(); }, []);

  async function lookup(value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.length < 10) { setCustomer(null); return; }
    try {
      const r = await api<{ customer: { name: string | null; cashback_balance: number } | null }>("/api/painel/customers?phone=" + digits);
      setCustomer(r.customer);
      if (r.customer?.name && !name) setName(r.customer.name);
    } catch { setCustomer(null); }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError("");
    const form = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const r = await api<{ order: { id: string } }>("/api/painel/orders", { body: { ...form, cashback_used: cashbackToUse } });
      onCreated(r.order.id);
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  return <dialog ref={ref} className="pt-dialog" onClose={onClose}>
    <form onSubmit={submit}>
      <div className="pt-between"><h2>Novo pedido</h2><button type="button" className="pt-icon-btn" aria-label="Fechar" onClick={onClose}><X size={18} /></button></div>
      <label className="pt-field"><span>Telefone do cliente (WhatsApp)</span>
        <input name="customer_phone" inputMode="tel" autoComplete="off" placeholder="(44) 99999-0000" onBlur={ev => lookup(ev.target.value)} onChange={ev => { if (ev.target.value.replace(/\D/g, "").length >= 10) lookup(ev.target.value); }} />
      </label>
      {customer && customer.cashback_balance > 0 && <label className="pt-check pt-notice">
        <input type="checkbox" checked={useCashback} onChange={ev => setUseCashback(ev.target.checked)} />
        <span>Cliente tem {brl(customer.cashback_balance)} de cashback. Usar neste pedido{cashbackToUse > 0 ? ` (${brl(cashbackToUse)})` : ""}?</span>
      </label>}
      <label className="pt-field"><span>Nome do cliente</span><input name="customer_name" required minLength={2} maxLength={90} value={name} onChange={ev => setName(ev.target.value)} /></label>
      <label className="pt-field"><span>Endereço de entrega</span><input name="destination" required minLength={5} maxLength={240} placeholder="Rua, número, bairro, cidade" /></label>
      <div className="pt-form-grid">
        <label className="pt-field"><span>Valor do pedido (R$)</span><input name="total_amount" inputMode="decimal" placeholder="0,00" value={total} onChange={ev => setTotal(ev.target.value)} /></label>
        <label className="pt-field"><span>Entregador</span>
          <select name="courier_id" defaultValue="">
            <option value="">Escolher depois</option>
            {data.couriers.filter(c => c.active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>
      <label className="pt-field"><span>Observações</span><textarea name="notes" maxLength={300} placeholder="Troco, ponto de referência, interfone…" /></label>
      {pct > 0 && <p className="pt-small pt-muted">Com telefone e valor, o cliente ganha {pct.toLocaleString("pt-BR")}% de cashback quando a entrega for concluída.</p>}
      {error && <p className="pt-error" role="alert">{error}</p>}
      <button className="pt-btn pt-btn-block" disabled={busy}>{busy ? "Criando…" : "Criar pedido"}</button>
    </form>
  </dialog>;
}

function CreatedDialog({ order, establishmentName, onClose }: { order: Order | null; establishmentName: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  if (!order) return null;
  const url = trackingUrl(order);
  return <dialog ref={ref} className="pt-dialog" onClose={onClose}>
    <div className="pt-dialog-body">
      <h2>Pedido {order.number ? "#" + order.number : ""} criado</h2>
      <p className="pt-muted">Envie o link para o cliente acompanhar a entrega.</p>
      <input className="pt-input" readOnly value={url} onFocus={ev => ev.currentTarget.select()} aria-label="Link do cliente" />
      <div className="pt-row">
        {order.customer_phone && <a className="pt-btn pt-btn-blue" target="_blank" rel="noreferrer" href={whatsappUrl(order.customer_phone, `Olá, ${order.customer_name}! Acompanhe seu pedido de ${establishmentName} em tempo real: ${url}`)}><MessageCircle size={17} /> Enviar pelo WhatsApp</a>}
        <button className="pt-btn pt-btn-light" onClick={() => navigator.clipboard?.writeText(url).catch(() => {})}><Copy size={16} /> Copiar link</button>
        <button className="pt-btn" onClick={onClose}>Pronto</button>
      </div>
    </div>
  </dialog>;
}
