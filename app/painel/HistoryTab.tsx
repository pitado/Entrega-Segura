"use client";

import { useCallback, useEffect, useState } from "react";
import { api, brl, dateTime, phone, statusLabel } from "../components/client";
import type { Courier } from "./types";

type Row = {
  id: string; number: number | null; customer_name: string; customer_phone: string | null; destination: string; status: string;
  created_at: string; courier_name: string | null; total_amount: number | null; cashback_used: number; cashback_earned: number; minutes: number | null;
};
type Totals = { total: number; delivered: number; cancelled: number; revenue: number; cashback: number; avg_minutes: number | null };
const isoDay = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export default function HistoryTab({ couriers }: { couriers: Courier[] }) {
  const [filters, setFilters] = useState(() => ({ from: isoDay(new Date(Date.now() - 6 * 86400000)), to: isoDay(new Date()), status: "", courier: "", q: "" }));
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (nextPage: number) => {
    setLoading(true); setError("");
    const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    params.set("page", String(nextPage));
    try {
      const r = await api<{ orders: Row[]; totals: Totals; hasMore: boolean }>("/api/painel/history?" + params);
      setRows(prev => nextPage === 0 ? r.orders : [...prev, ...r.orders]);
      setTotals(r.totals); setHasMore(r.hasMore); setPage(nextPage);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { const t = setTimeout(() => load(0), 250); return () => clearTimeout(t); }, [load]);
  const set = (k: keyof typeof filters) => (e: { target: { value: string } }) => setFilters(f => ({ ...f, [k]: e.target.value }));

  return <>
    <div className="pt-card pt-stack">
      <h2>Histórico de entregas</h2>
      <div className="pt-form-grid">
        <label className="pt-field"><span>De</span><input type="date" value={filters.from} onChange={set("from")} /></label>
        <label className="pt-field"><span>Até</span><input type="date" value={filters.to} onChange={set("to")} /></label>
        <label className="pt-field"><span>Situação</span>
          <select value={filters.status} onChange={set("status")}><option value="">Todas</option><option value="delivered">Entregues</option><option value="cancelled">Canceladas</option></select></label>
        <label className="pt-field"><span>Entregador</span>
          <select value={filters.courier} onChange={set("courier")}><option value="">Todos</option>{couriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="pt-field"><span>Buscar</span><input type="search" placeholder="Cliente, telefone, endereço ou nº" value={filters.q} onChange={set("q")} /></label>
      </div>
    </div>
    {totals && <div className="pt-stats">
      <div className="pt-stat"><b>{totals.delivered}</b><span>Entregues</span></div>
      <div className="pt-stat"><b>{totals.cancelled}</b><span>Canceladas</span></div>
      <div className="pt-stat"><b>{brl(totals.revenue)}</b><span>Vendido</span></div>
      <div className="pt-stat"><b>{brl(totals.cashback)}</b><span>Cashback gerado</span></div>
      <div className="pt-stat"><b>{totals.avg_minutes != null ? totals.avg_minutes + " min" : "–"}</b><span>Tempo médio</span></div>
    </div>}
    {error && <p className="pt-error" role="alert">{error}</p>}
    {rows.length === 0 && !loading ? <div className="pt-card pt-empty">Nenhuma entrega finalizada neste período.</div> :
      <div className="pt-table-wrap"><table className="pt-table">
        <thead><tr><th>Nº</th><th>Data</th><th>Cliente</th><th>Endereço</th><th>Entregador</th><th>Situação</th><th className="pt-num">Tempo</th><th className="pt-num">Valor</th><th className="pt-num">Cashback</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.id}>
          <td>{r.number ?? "–"}</td>
          <td>{dateTime(r.created_at)}</td>
          <td>{r.customer_name}{r.customer_phone && <div className="pt-small pt-muted">{phone(r.customer_phone)}</div>}</td>
          <td className="wrap">{r.destination}</td>
          <td>{r.courier_name || "–"}</td>
          <td><span className={"pt-badge " + r.status}>{statusLabel[r.status]}</span></td>
          <td className="pt-num">{r.minutes != null ? r.minutes + " min" : "–"}</td>
          <td className="pt-num">{r.total_amount != null ? brl(r.total_amount) : "–"}</td>
          <td className="pt-num">{r.cashback_earned > 0 ? "+" + brl(r.cashback_earned) : r.cashback_used > 0 ? "−" + brl(r.cashback_used) : "–"}</td>
        </tr>)}</tbody>
      </table></div>}
    {hasMore && <button className="pt-btn pt-btn-light" disabled={loading} onClick={() => load(page + 1)}>{loading ? "Carregando…" : "Carregar mais"}</button>}
  </>;
}
