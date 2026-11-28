"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, brl, dateTime, phone } from "../components/client";
import type { Overview } from "./types";

type Customer = { id: string; name: string | null; phone: string; cashback_balance: number; orders: number; spent: number; last_order_at: string | null };
type Totals = { customers: number; balance: number; earned: number; redeemed: number };

export default function CustomersTab({ data, refresh }: { data: Overview; refresh: () => Promise<void> }) {
  const e = data.establishment;
  const [q, setQ] = useState("");
  const [list, setList] = useState<Customer[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      api<{ customers: Customer[]; totals: Totals }>("/api/painel/customers?q=" + encodeURIComponent(q))
        .then(r => { setList(r.customers); setTotals(r.totals); }).catch(err => setError(err.message));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function save(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setBusy(true); setError(""); setSaved(false);
    try {
      await api("/api/painel/settings", { method: "PATCH", body: Object.fromEntries(new FormData(ev.currentTarget)) });
      await refresh();
      setSaved(true);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  return <>
    <div className="pt-card pt-stack">
      <h2>Cashback</h2>
      <p className="pt-muted">O cliente é identificado pelo telefone. Quando a entrega é concluída, ele ganha uma porcentagem do valor pago como saldo para usar no próximo pedido. O saldo usado é descontado na criação do pedido.</p>
      <form className="pt-form-grid" style={{ alignItems: "end" }} onSubmit={save}>
        <label className="pt-field"><span>Porcentagem de cashback (%)</span><input name="cashback_percent" inputMode="decimal" defaultValue={String(e.cashback_percent).replace(".", ",")} /></label>
        <label className="pt-field"><span>Pedido mínimo para ganhar (R$)</span><input name="cashback_min_order" inputMode="decimal" defaultValue={String(e.cashback_min_order).replace(".", ",")} /></label>
        <button className="pt-btn" disabled={busy}>Salvar</button>
      </form>
      {e.cashback_percent === 0 && <p className="pt-notice">O cashback está desligado. Defina uma porcentagem acima de 0 para ativar.</p>}
      {saved && <p className="pt-success">Configuração salva.</p>}
      {error && <p className="pt-error" role="alert">{error}</p>}
    </div>
    {totals && <div className="pt-stats">
      <div className="pt-stat"><b>{totals.customers}</b><span>Clientes</span></div>
      <div className="pt-stat"><b>{brl(totals.earned)}</b><span>Cashback gerado</span></div>
      <div className="pt-stat"><b>{brl(totals.redeemed)}</b><span>Cashback usado</span></div>
      <div className="pt-stat"><b>{brl(totals.balance)}</b><span>Saldo disponível dos clientes</span></div>
    </div>}
    <div className="pt-card pt-stack">
      <div className="pt-between"><h2>Clientes</h2>
        <input className="pt-input" style={{ maxWidth: 320 }} type="search" placeholder="Buscar por nome ou telefone" value={q} onChange={ev => setQ(ev.target.value)} aria-label="Buscar clientes" />
      </div>
      {list.length === 0 ? <div className="pt-empty">Os clientes aparecem aqui quando você cria pedidos com telefone.</div> :
        <div className="pt-table-wrap"><table className="pt-table">
          <thead><tr><th>Cliente</th><th>Telefone</th><th className="pt-num">Pedidos</th><th className="pt-num">Total gasto</th><th className="pt-num">Saldo</th><th>Último pedido</th></tr></thead>
          <tbody>{list.map(c => <tr key={c.id}>
            <td>{c.name || "–"}</td><td>{phone(c.phone)}</td><td className="pt-num">{c.orders}</td>
            <td className="pt-num">{brl(c.spent)}</td><td className="pt-num"><b>{brl(c.cashback_balance)}</b></td><td>{dateTime(c.last_order_at)}</td>
          </tr>)}</tbody>
        </table></div>}
    </div>
  </>;
}
