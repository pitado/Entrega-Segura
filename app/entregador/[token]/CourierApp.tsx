"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, LocateFixed, MapPin, Navigation, Phone } from "lucide-react";
import Art from "../../components/Art";
import PitouLogo from "../../components/PitouLogo";
import { api, brl, mapsLinks, phone, statusLabel, time, toPoint } from "../../components/client";

type Order = {
  id: string; number: number | null; customer_name: string; customer_phone: string | null; destination: string;
  destination_latitude: number | null; destination_longitude: number | null; notes: string | null;
  status: "preparing" | "on_route" | "arrived"; customer_ready: boolean; total_amount: number | null; cashback_used: number; created_at: string;
};
type Data = { courier: { name: string; establishment_name: string; establishment_phone: string | null }; orders: Order[]; today: { delivered: number } };
type Gps = { state: "off" | "starting" | "on" | "error"; accuracy?: number; sentAt?: number; message?: string };
type WakeLock = { release: () => Promise<void> };
const SEND_EVERY_MS = 8000;

export default function CourierApp({ token }: { token: string }) {
  const base = `/api/courier/${token}`;
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [gps, setGps] = useState<Gps>({ state: "off" });
  const watch = useRef<number | null>(null);
  const lastSent = useRef(0);
  const lastPos = useRef<GeolocationCoordinates | null>(null);
  const wakeLock = useRef<WakeLock | null>(null);
  const hasRoute = Boolean(data?.orders.some(o => o.status !== "preparing"));
  const hasRouteRef = useRef(hasRoute);
  hasRouteRef.current = hasRoute;
  const dataRef = useRef<Data | null>(null);
  dataRef.current = data;

  const load = useCallback(async () => {
    try { setData(await api<Data>(base)); setError(""); }
    catch (err) { setError((err as Error).message); }
  }, [base]);

  useEffect(() => {
    load();
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 10000);
    return () => clearInterval(t);
  }, [load]);

  const stopGps = useCallback(async (notify = true) => {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    wakeLock.current?.release().catch(() => {});
    wakeLock.current = null;
    setGps({ state: "off" });
    if (notify) await api(base, { body: { action: "stop", order_id: data?.orders[0]?.id } }).catch(() => {});
  }, [base, data]);

  // Envia a última posição conhecida, no máximo a cada SEND_EVERY_MS. Também roda num intervalo,
  // porque o celular parado pode não disparar novas leituras de GPS.
  const sendPosition = useCallback(async (force = false) => {
    const pos = lastPos.current;
    if (!pos || !hasRouteRef.current || (!force && Date.now() - lastSent.current < SEND_EVERY_MS)) return;
    const orderId = dataRef.current?.orders.find(o => o.status !== "preparing")?.id;
    if (!orderId) return;
    lastSent.current = Date.now();
    try {
      await api(base, { body: { action: "location", order_id: orderId, latitude: pos.latitude, longitude: pos.longitude, accuracy_m: Math.min(pos.accuracy, 10000) } });
      setGps(g => ({ ...g, sentAt: Date.now(), message: undefined }));
    } catch (err) { setGps(g => ({ ...g, message: (err as Error).message })); }
  }, [base]);
  useEffect(() => {
    if (gps.state !== "on" || !hasRoute) return;
    sendPosition(true);
    const t = setInterval(() => sendPosition(), SEND_EVERY_MS + 500);
    return () => clearInterval(t);
  }, [gps.state, hasRoute, sendPosition]);

  const startGps = useCallback(() => {
    if (!("geolocation" in navigator)) { setGps({ state: "error", message: "Este celular não informa a localização pelo navegador." }); return; }
    if (watch.current !== null) return;
    setGps({ state: "starting" });
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLock> } };
    nav.wakeLock?.request("screen").then(l => { wakeLock.current = l; }).catch(() => {});
    watch.current = navigator.geolocation.watchPosition(pos => {
      lastPos.current = pos.coords;
      setGps(g => ({ ...g, state: "on", accuracy: Math.round(pos.coords.accuracy) }));
      sendPosition();
    }, err => {
      setGps({ state: "error", message: err.code === 1 ? "Permita o acesso à localização nas configurações do navegador." : "Não foi possível obter o GPS. Tente em local aberto." });
      if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
      watch.current = null;
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
  }, [sendPosition]);
  useEffect(() => () => { if (watch.current !== null) navigator.geolocation.clearWatch(watch.current); }, []);
  // Sem entrega em rota, o GPS para sozinho.
  useEffect(() => { if (data && !hasRoute && watch.current !== null) stopGps(false); }, [data, hasRoute, stopGps]);

  async function setStatus(o: Order, status: string) {
    setBusy(o.id); setError("");
    try {
      await api(base, { body: { action: "status", order_id: o.id, status } });
      if (status === "on_route") { lastSent.current = 0; startGps(); }
      await load();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(null); }
  }

  if (!data) return <main className="pt"><div className="pt-narrow">
    <PitouLogo size={36} />
    {error ? <p className="pt-error" role="alert">{error}</p> : <p className="pt-muted">Carregando suas entregas…</p>}
  </div></main>;

  return <main className="pt"><div className="pt-narrow">
    <div className="pt-brand-head">
      <span className="pt-grow"><PitouLogo size={32} /></span>
      <span className={"pt-badge " + (gps.state === "on" ? "on_route" : "")}>{gps.state === "on" ? "Localização ao vivo" : "Localização desligada"}</span>
    </div>
    <div className="pt-hero-card">
      <span className="pt-hero-kicker">Entregas de {data.courier.establishment_name}</span>
      <h1>Olá, {data.courier.name.split(" ")[0]}</h1>
      <p>{data.today.delivered} entregue{data.today.delivered === 1 ? "" : "s"} hoje</p>
      <Art name="moto" label={false} />
    </div>

    <div className="pt-card pt-stack">
      <div className="pt-between">
        <div className="pt-row"><LocateFixed size={20} aria-hidden="true" /><h3>Localização</h3>
          {gps.state === "on" && <span className="pt-badge delivered">Compartilhando</span>}
        </div>
        {gps.state === "off" || gps.state === "error"
          ? <button className="pt-btn pt-btn-sm" onClick={startGps} disabled={!hasRoute}>Compartilhar localização</button>
          : <button className="pt-btn pt-btn-light pt-btn-sm" onClick={() => stopGps()}>Parar</button>}
      </div>
      <p className="pt-small pt-muted">
        {!hasRoute ? "Quando você sair com um pedido, sua localização é enviada ao cliente e ao estabelecimento."
          : gps.state === "on" ? `GPS ativo (precisão de ${gps.accuracy} m). Mantenha esta tela aberta durante a entrega.`
          : gps.state === "starting" ? "Ativando o GPS…" : "Ative para o cliente ver você no mapa."}
      </p>
      {gps.message && <p className="pt-error">{gps.message}</p>}
    </div>

    {error && <p className="pt-error" role="alert">{error}</p>}
    {data.orders.length === 0 && <div className="pt-card pt-empty"><b>Nenhuma entrega para você agora</b><span>Esta tela atualiza sozinha quando o estabelecimento atribuir um pedido.</span></div>}
    {data.orders.map(o => {
      const point = toPoint(o.destination_latitude, o.destination_longitude);
      const links = mapsLinks(point, o.destination);
      const toCharge = o.total_amount != null ? o.total_amount - (o.cashback_used || 0) : null;
      return <div key={o.id} className="pt-card pt-stack">
        <div className="pt-between">
          <h2>{o.number ? `#${o.number} · ` : ""}{o.customer_name}</h2>
          <span className={"pt-badge " + o.status}>{statusLabel[o.status]}</span>
        </div>
        {o.customer_ready && <p className="pt-success">O cliente está pronto para receber.</p>}
        <p className="pt-row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}><MapPin size={18} style={{ flex: "none", marginTop: 2 }} aria-hidden="true" /> <span>{o.destination}</span></p>
        {o.notes && <p className="pt-notice">{o.notes}</p>}
        <dl className="pt-kv">
          {toCharge != null && <><dt>Cobrar</dt><dd><b>{brl(toCharge)}</b>{o.cashback_used > 0 && <span className="pt-muted"> (já descontado {brl(o.cashback_used)} de cashback)</span>}</dd></>}
          <dt>Pedido feito</dt><dd>{time(o.created_at)}</dd>
        </dl>
        <div className="pt-row">
          <a className="pt-btn pt-btn-light pt-btn-sm" href={links.waze} target="_blank" rel="noreferrer"><Navigation size={15} /> Waze</a>
          <a className="pt-btn pt-btn-light pt-btn-sm" href={links.google} target="_blank" rel="noreferrer"><Navigation size={15} /> Google Maps</a>
          {o.customer_phone && <a className="pt-btn pt-btn-light pt-btn-sm" href={"tel:" + o.customer_phone}><Phone size={15} /> {phone(o.customer_phone)}</a>}
        </div>
        {o.status === "preparing" && <button className="pt-btn pt-btn-block" disabled={busy === o.id} onClick={() => setStatus(o, "on_route")}>Saí para entrega</button>}
        {o.status === "on_route" && <button className="pt-btn pt-btn-light pt-btn-block" disabled={busy === o.id} onClick={() => setStatus(o, "arrived")}>Cheguei no endereço</button>}
        {o.status !== "preparing" && <button className="pt-btn pt-btn-green pt-btn-block" disabled={busy === o.id} onClick={() => setStatus(o, "delivered")}><Check size={18} /> Entrega concluída</button>}
      </div>;
    })}
    <p className="pt-footer-note">Não compartilhe este link. Ele dá acesso às suas entregas.</p>
  </div></main>;
}
