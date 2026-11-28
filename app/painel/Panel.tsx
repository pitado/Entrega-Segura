"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bike, ClipboardList, Gift, History, LogOut, MenuSquare, Settings } from "lucide-react";
import PitouLogo from "../components/PitouLogo";
import { api, ApiError } from "../components/client";
import type { Overview } from "./types";
import OrdersTab from "./OrdersTab";
import HistoryTab from "./HistoryTab";
import CouriersTab from "./CouriersTab";
import CustomersTab from "./CustomersTab";
import MenuTab from "./MenuTab";
import AccountTab from "./AccountTab";
import Subscription from "./Subscription";

const tabs = [
  { id: "pedidos", label: "Pedidos", icon: ClipboardList },
  { id: "historico", label: "Histórico", icon: History },
  { id: "entregadores", label: "Entregadores", icon: Bike },
  { id: "clientes", label: "Clientes e cashback", icon: Gift },
  { id: "cardapio", label: "Cardápio digital", icon: MenuSquare },
  { id: "conta", label: "Conta e plano", icon: Settings },
] as const;
type Tab = (typeof tabs)[number]["id"];
const POLL_MS = 8000;

export default function Panel() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("pedidos");
  const [blocked, setBlocked] = useState(false);
  const loading = useRef(false);

  const refresh = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      setData(await api<Overview>("/api/painel"));
      setError("");
      setBlocked(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { location.replace("/entrar"); return; }
      if (err instanceof ApiError && err.status === 402) { setBlocked(true); setData(null); setError(""); return; }
      setError((err as Error).message);
    } finally { loading.current = false; }
  }, []);

  useEffect(() => {
    const fromHash = location.hash.slice(1) as Tab;
    if (tabs.some(t => t.id === fromHash)) setTab(fromHash);
    // Volta do Mercado Pago: abre "Conta e plano", onde a assinatura é confirmada.
    if (new URLSearchParams(location.search).has("assinatura")) setTab("conta");
    refresh();
    const timer = setInterval(() => { if (document.visibilityState === "visible") refresh(); }, POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [refresh]);

  function choose(next: Tab) {
    setTab(next);
    history.replaceState(null, "", "#" + next);
  }

  async function logout() {
    await api("/api/auth/logout", { body: {} }).catch(() => {});
    location.replace("/entrar");
  }

  return <div className="pt">
    <header className="pt-top">
      <div className="pt-top-inner">
        <a href="/painel" aria-label="Pitou, painel"><PitouLogo size={34} /></a>
        <span className="pt-top-name">{data?.establishment.name}</span>
        <button className="pt-btn pt-btn-light pt-btn-sm" style={{ marginLeft: "auto" }} onClick={logout}><LogOut size={16} aria-hidden="true" /> Sair</button>
      </div>
      {!blocked && <nav className="pt-tabs" role="tablist" aria-label="Seções do painel">
        {tabs.map(t => <button key={t.id} role="tab" className="pt-tab" aria-selected={tab === t.id} onClick={() => choose(t.id)}>
          <t.icon size={17} aria-hidden="true" /> {t.label}
        </button>)}
      </nav>}
    </header>
    <main className="pt-main">
      {error && <p className="pt-error" role="alert">{error}</p>}
      {blocked && <Subscription blocked onChange={refresh} />}
      {data?.access.reason === "trial" && tab !== "conta" && <p className="pt-card pt-small">
        Teste grátis até {new Date(data.access.trialEndsAt || "").toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}. <a href="#conta" onClick={e => { e.preventDefault(); choose("conta"); }}>Assine em Conta e plano</a> para continuar depois disso.
      </p>}
      {blocked ? null : !data ? !error && <p className="pt-muted">Carregando o painel…</p> : <>
        {tab === "pedidos" && <OrdersTab data={data} refresh={refresh} goTo={choose} />}
        {tab === "historico" && <HistoryTab couriers={data.couriers} />}
        {tab === "entregadores" && <CouriersTab data={data} refresh={refresh} />}
        {tab === "clientes" && <CustomersTab data={data} refresh={refresh} />}
        {tab === "cardapio" && <MenuTab data={data} refresh={refresh} />}
        {tab === "conta" && <AccountTab data={data} refresh={refresh} />}
      </>}
    </main>
  </div>;
}
