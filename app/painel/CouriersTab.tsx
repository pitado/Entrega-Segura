"use client";

import { useState, type FormEvent } from "react";
import { Check, Copy, MessageCircle, Plus } from "lucide-react";
import { api, ApiError, brl, phone, whatsappUrl } from "../components/client";
import type { Courier, Overview } from "./types";

export default function CouriersTab({ data, refresh }: { data: Overview; refresh: () => Promise<void> }) {
  const { couriers, plan, establishment } = data;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [needsSlot, setNeedsSlot] = useState(false);
  const [link, setLink] = useState<{ name: string; phone: string | null; url: string } | null>(null);
  const full = plan.activeCouriers >= plan.courierLimit;

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    setBusy(true); setError(""); setNeedsSlot(false);
    try {
      const r = await api<{ courier: { name: string }; courier_url: string }>("/api/painel/couriers", { body });
      setLink({ name: r.courier.name, phone: String(body.phone || "") || null, url: r.courier_url });
      form.reset();
      await refresh();
    } catch (err) {
      setError((err as Error).message);
      if (err instanceof ApiError && err.code === "courier_limit") setNeedsSlot(true);
    } finally { setBusy(false); }
  }

  async function addSlot() {
    setBusy(true); setError("");
    try {
      await api("/api/painel/settings", { method: "PATCH", body: { extra_couriers: plan.extraCouriers + 1 } });
      setNeedsSlot(false);
      await refresh();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  return <>
    <div className="pt-card pt-stack">
      <div className="pt-between">
        <div>
          <h2>Entregadores</h2>
          <p className="pt-muted" style={{ marginTop: 4 }}>
            {plan.activeCouriers} de {plan.courierLimit} vagas em uso ({plan.includedCouriers} incluídas no plano{plan.extraCouriers ? ` + ${plan.extraCouriers} adicional${plan.extraCouriers > 1 ? "is" : ""}` : ""}).
          </p>
        </div>
      </div>
      <form className="pt-form-grid" onSubmit={create} style={{ alignItems: "end" }}>
        <label className="pt-field"><span>Nome</span><input name="name" required minLength={2} maxLength={80} /></label>
        <label className="pt-field"><span>Telefone (opcional)</span><input name="phone" inputMode="tel" placeholder="(44) 99999-0000" /></label>
        <button className="pt-btn" disabled={busy}><Plus size={17} aria-hidden="true" /> Cadastrar entregador</button>
      </form>
      {full && !needsSlot && <p className="pt-notice">Todas as vagas estão em uso. Cada entregador adicional custa {brl(plan.extraCourierPrice)}/mês.</p>}
      {error && <p className="pt-error" role="alert">{error}</p>}
      {(needsSlot || full) && <div className="pt-notice pt-between">
        <span>Adicionar 1 vaga de entregador: +{brl(plan.extraCourierPrice)}/mês. Sua mensalidade passa a ser {brl(plan.monthly + plan.extraCourierPrice)}.</span>
        <button className="pt-btn pt-btn-sm" disabled={busy} onClick={addSlot}>Adicionar vaga</button>
      </div>}
    </div>
    {link && <LinkCard name={link.name} phoneNumber={link.phone} url={link.url} establishment={establishment.name} onClose={() => setLink(null)} />}
    {couriers.length === 0 ? <div className="pt-card pt-empty">Nenhum entregador cadastrado ainda.</div> :
      <div className="pt-stack">{couriers.map(c => <CourierRow key={c.id} courier={c} refresh={refresh} onLink={(url) => setLink({ name: c.name, phone: c.phone, url })} />)}</div>}
  </>;
}

function LinkCard({ name, phoneNumber, url, establishment, onClose }: { name: string; phoneNumber: string | null; url: string; establishment: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return <div className="pt-card pt-stack" style={{ border: "2px solid var(--ink)" }}>
    <h3>Link do entregador {name}</h3>
    <p className="pt-muted pt-small">Envie este link só para o entregador. Ele abre no celular, sem instalar nada. Por segurança, o link aparece apenas agora; se perder, gere outro.</p>
    <div className="pt-copy">
      <input className="pt-input" readOnly value={url} onFocus={e => e.currentTarget.select()} aria-label="Link do entregador" />
      <button className="pt-btn pt-btn-light pt-btn-sm" onClick={() => navigator.clipboard?.writeText(url).then(() => setCopied(true)).catch(() => {})}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copiado" : "Copiar"}</button>
    </div>
    <div className="pt-row">
      {phoneNumber && <a className="pt-btn pt-btn-blue" target="_blank" rel="noreferrer" href={whatsappUrl(phoneNumber, `Olá, ${name}! Este é o seu link de entregas do ${establishment} no Pitou: ${url}`)}><MessageCircle size={17} /> Enviar pelo WhatsApp</a>}
      <button className="pt-btn pt-btn-light" onClick={onClose}>Fechar</button>
    </div>
  </div>;
}

function CourierRow({ courier: c, refresh, onLink }: { courier: Courier; refresh: () => Promise<void>; onLink: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const online = c.last_seen && Date.now() - new Date(c.last_seen).getTime() < 120000;

  async function act(body: Record<string, unknown>) {
    setBusy(true); setError("");
    try {
      const r = await api<{ courier_url?: string }>(`/api/painel/couriers/${c.id}`, { method: "PATCH", body });
      if (r.courier_url) onLink(r.courier_url);
      setEditing(false);
      await refresh();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="pt-card pt-stack" style={c.active ? undefined : { opacity: .7 }}>
    {editing ? <form className="pt-form-grid" style={{ alignItems: "end" }} onSubmit={e => { e.preventDefault(); act({ action: "edit", ...Object.fromEntries(new FormData(e.currentTarget)) }); }}>
      <label className="pt-field"><span>Nome</span><input name="name" defaultValue={c.name} required minLength={2} /></label>
      <label className="pt-field"><span>Telefone</span><input name="phone" defaultValue={c.phone || ""} inputMode="tel" /></label>
      <div className="pt-row"><button className="pt-btn" disabled={busy}>Salvar</button><button type="button" className="pt-btn pt-btn-light" onClick={() => setEditing(false)}>Cancelar</button></div>
    </form> : <div className="pt-between">
      <div className="pt-grow">
        <div className="pt-row"><h3>{c.name}</h3>
          {!c.active ? <span className="pt-badge cancelled">Desativado</span> : online ? <span className="pt-badge delivered">GPS ativo</span> : null}
          {c.active_orders > 0 && <span className="pt-badge on_route">{c.active_orders} em andamento</span>}
        </div>
        <p className="pt-small pt-muted" style={{ marginTop: 4 }}>
          {c.phone ? phone(c.phone) + " · " : ""}{c.active ? (c.has_link ? "Link ativo" : "Sem link ativo") : "Sem acesso"}
        </p>
      </div>
      <div className="pt-row">
        {c.active && <button className="pt-btn pt-btn-light pt-btn-sm" disabled={busy} onClick={() => act({ action: "new_link" })}>{c.has_link ? "Gerar novo link" : "Gerar link"}</button>}
        {c.active && c.has_link && <button className="pt-btn pt-btn-light pt-btn-sm" disabled={busy} onClick={() => act({ action: "revoke_link" })}>Bloquear link</button>}
        <button className="pt-btn pt-btn-light pt-btn-sm" disabled={busy} onClick={() => setEditing(true)}>Editar</button>
        {c.active ? <button className="pt-btn pt-btn-danger pt-btn-sm" disabled={busy} onClick={() => act({ action: "deactivate" })}>Desativar</button>
          : <button className="pt-btn pt-btn-sm" disabled={busy} onClick={() => act({ action: "activate" })}>Reativar</button>}
      </div>
    </div>}
    {error && <p className="pt-error" role="alert">{error}</p>}
  </div>;
}
