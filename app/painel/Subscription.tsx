"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CreditCard } from "lucide-react";
import { api, brl } from "../components/client";
import type { Access } from "./types";

type Billing = {
  access: Access;
  user: { name: string; email: string };
  subscription: { status: string | null; amount: number | null; payerEmail: string | null; paidUntil: string | null; exists: boolean };
  plan: { extraCouriers: number; menuEnabled: boolean; monthly: number; basePrice: number; includedCouriers: number; extraCourierPrice: number; menuPrice: number };
  trialDays: number;
  paymentsConfigured: boolean;
  paymentsMode: "test" | "live" | null;
};

const day = (v: string | null | undefined) => v ? new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" }) : "";
const statusText: Record<string, string> = {
  authorized: "ativa", pending: "aguardando pagamento", paused: "pausada", cancelled: "cancelada",
};

/** Assinatura do Pitou pelo Mercado Pago. `blocked` = painel bloqueado até pagar. */
export default function Subscription({ blocked = false, onChange }: { blocked?: boolean; onChange?: () => void }) {
  const [data, setData] = useState<Billing | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [extra, setExtra] = useState(0);
  const [menu, setMenu] = useState(false);

  const load = useCallback(async () => {
    const b = await api<Billing>("/api/painel/billing");
    setData(b);
    setExtra(b.plan.extraCouriers);
    setMenu(b.plan.menuEnabled);
    return b;
  }, []);

  // Na volta do Mercado Pago, consulta a assinatura algumas vezes até a confirmação chegar.
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const back = new URLSearchParams(location.search).get("assinatura") === "retorno";
        if (!back) { await load(); return; }
        history.replaceState(null, "", location.pathname + location.hash);
        setNotice("Confirmando seu pagamento com o Mercado Pago…");
        for (let i = 0; i < 6 && !stop; i++) {
          await api("/api/painel/billing/sync", { body: {} }).catch(() => {});
          const b = await load();
          if (b.subscription.status === "authorized") { setNotice("Pagamento confirmado. Bem-vindo ao Pitou!"); onChange?.(); return; }
          await new Promise(r => setTimeout(r, 4000));
        }
        if (!stop) setNotice("O Mercado Pago ainda não confirmou. Isso pode levar alguns minutos; use “Já paguei, verificar”.");
      } catch (err) { setError((err as Error).message); }
    })();
    return () => { stop = true; };
  }, [load, onChange]);

  async function subscribe(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const payer = String(new FormData(ev.currentTarget).get("payer_email") || "");
    setBusy(true); setError("");
    try {
      const r = await api<{ init_point: string }>("/api/painel/billing/subscribe", { body: { payer_email: payer, extra_couriers: extra, menu_enabled: menu } });
      location.assign(r.init_point);
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }
  async function verify() {
    setBusy(true); setError(""); setNotice("");
    try {
      const r = await api<{ status: string | null }>("/api/painel/billing/sync", { body: {} });
      const b = await load();
      setNotice(r.status === "authorized" ? "Assinatura ativa." : `Situação no Mercado Pago: ${statusText[r.status || ""] || "sem assinatura"}.`);
      if (b.access.active) onChange?.();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  async function cancel() {
    setBusy(true); setError(""); setNotice("");
    try {
      await api("/api/painel/billing/cancel", { body: {} });
      const b = await load();
      setConfirmCancel(false);
      setNotice(b.access.active && b.access.paidUntil ? `Assinatura cancelada. Você continua com acesso até ${day(b.access.paidUntil)}.` : "Assinatura cancelada.");
      onChange?.();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  if (!data) return <div className="pt-card">{error ? <p className="pt-error" role="alert">{error}</p> : <p className="pt-muted">Carregando assinatura…</p>}</div>;

  const { access, subscription: sub, plan } = data;
  const active = sub.status === "authorized";
  const total = Math.round((plan.basePrice + extra * plan.extraCourierPrice + (menu ? plan.menuPrice : 0)) * 100) / 100;
  const showForm = !active && access.reason !== "admin" && access.reason !== "exempt";

  return <div className="pt-card pt-stack">
    <h2><CreditCard size={20} aria-hidden="true" style={{ verticalAlign: "-3px" }} /> Assinatura</h2>
    {blocked && <p><b>Seu acesso ao painel está pausado.</b> {access.trialEndsAt && !sub.exists ? `O teste grátis terminou em ${day(access.trialEndsAt)}. ` : ""}Assine para continuar usando o Pitou.</p>}
    {access.reason === "admin" && <p className="pt-success">Acesso de administrador: o painel fica liberado sem pagamento.</p>}
    {access.reason === "exempt" && <p className="pt-success">Conta de cortesia: o painel fica liberado sem pagamento.</p>}
    {access.reason === "trial" && <p>Teste grátis até <b>{day(access.trialEndsAt)}</b>. Assine quando quiser para não perder o acesso.</p>}
    {active && <p className="pt-success">Assinatura ativa: <b>{brl(sub.amount)}/mês</b>{access.paidUntil ? `, próxima cobrança em ${day(access.paidUntil)}` : ""}. Pagamento pelo Mercado Pago{sub.payerEmail ? ` (${sub.payerEmail})` : ""}.</p>}
    {!active && sub.status && sub.status !== "pending" && <p>Assinatura {statusText[sub.status] || sub.status}{access.reason === "paid" && access.paidUntil ? `. Seu acesso continua até ${day(access.paidUntil)}` : ""}.</p>}
    {sub.status === "pending" && <p>Assinatura aguardando a confirmação do Mercado Pago. Se você já pagou, clique em “Já paguei, verificar”.</p>}

    {showForm && <form className="pt-stack" onSubmit={subscribe}>
      <div className="pt-table-wrap"><table className="pt-table"><tbody>
        <tr><td>Plano Pitou (até {plan.includedCouriers} entregadores)</td><td className="pt-num">{brl(plan.basePrice)}</td></tr>
        <tr><td>
          <span style={{ display: "block", marginBottom: 6 }}>Entregadores adicionais</span>
          <span className="pt-row" style={{ gap: 8, flexWrap: "nowrap" }}>
            <button type="button" className="pt-btn pt-btn-light pt-btn-sm" aria-label="Menos um entregador adicional" disabled={busy || extra === 0} onClick={() => setExtra(extra - 1)}>−</button>
            <b>{extra}</b>
            <button type="button" className="pt-btn pt-btn-light pt-btn-sm" aria-label="Mais um entregador adicional" disabled={busy || extra >= 500} onClick={() => setExtra(extra + 1)}>+</button>
            <span className="pt-muted">× {brl(plan.extraCourierPrice)}</span>
          </span>
        </td><td className="pt-num">{brl(extra * plan.extraCourierPrice)}</td></tr>
        <tr><td><label className="pt-row" style={{ gap: 8 }}><input type="checkbox" checked={menu} onChange={e => setMenu(e.target.checked)} /> Menu Digital Próprio</label></td><td className="pt-num">{brl(menu ? plan.menuPrice : 0)}</td></tr>
        <tr><td><b>Total por mês</b></td><td className="pt-num"><b>{brl(total)}</b></td></tr>
      </tbody></table></div>
      <label className="pt-field"><span>E-mail da sua conta Mercado Pago</span>
        <input name="payer_email" type="email" required maxLength={160} defaultValue={sub.payerEmail || data.user.email} autoComplete="email" />
        <small className="pt-muted" style={{ fontWeight: 450 }}>Use o mesmo e-mail com que você entra no Mercado Pago.</small>
      </label>
      {data.paymentsMode === "test" && <p className="pt-small pt-muted">Pagamento em modo de teste: só comprador de teste do Mercado Pago, com cartão de teste. Nenhuma cobrança real é feita.</p>}
      {!data.paymentsConfigured && <p className="pt-error">O pagamento ainda não foi configurado no servidor. Fale com a equipe Pitou.</p>}
      <button className="pt-btn" disabled={busy || !data.paymentsConfigured}>{busy ? "Abrindo o Mercado Pago…" : `Assinar por ${brl(total)}/mês`}</button>
      <p className="pt-small pt-muted">Cobrança mensal recorrente no cartão pelo Mercado Pago. Sem fidelidade: cancele quando quiser e use até o fim do mês pago.</p>
    </form>}

    <div className="pt-row">
      {sub.exists && <button type="button" className="pt-btn pt-btn-light pt-btn-sm" disabled={busy} onClick={verify}>Já paguei, verificar</button>}
      {active && !confirmCancel && <button type="button" className="pt-btn pt-btn-danger pt-btn-sm" disabled={busy} onClick={() => setConfirmCancel(true)}>Cancelar assinatura</button>}
      {active && confirmCancel && <>
        <span className="pt-small">Cancelar a cobrança mensal? Você usa até o fim do mês pago.</span>
        <button type="button" className="pt-btn pt-btn-danger pt-btn-sm" disabled={busy} onClick={cancel}>Sim, cancelar</button>
        <button type="button" className="pt-btn pt-btn-light pt-btn-sm" disabled={busy} onClick={() => setConfirmCancel(false)}>Voltar</button>
      </>}
    </div>
    {notice && <p className="pt-success" role="status">{notice}</p>}
    {error && <p className="pt-error" role="alert">{error}</p>}
  </div>;
}
