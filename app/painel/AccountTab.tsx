"use client";

import { useState, type FormEvent } from "react";
import { MapPin } from "lucide-react";
import { api, brl } from "../components/client";
import type { Overview } from "./types";
import Subscription from "./Subscription";

export default function AccountTab({ data, refresh }: { data: Overview; refresh: () => Promise<void> }) {
  const { establishment: e, plan, user } = data;
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);

  async function save(body: Record<string, unknown>, message: string) {
    setBusy(true); setError(""); setSaved("");
    try { await api("/api/painel/settings", { method: "PATCH", body }); await refresh(); setSaved(message); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  function profile(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const body: Record<string, unknown> = Object.fromEntries(new FormData(ev.currentTarget));
    if (point) { body.latitude = point.lat; body.longitude = point.lng; }
    save(body, "Dados salvos.");
  }
  function locate() {
    if (!navigator.geolocation) { setError("Este navegador não informa a localização."); return; }
    navigator.geolocation.getCurrentPosition(
      p => setPoint({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setError("Não foi possível obter a localização. Verifique a permissão do navegador."),
      { enableHighAccuracy: true, timeout: 15000 });
  }

  const extraTotal = plan.extraCouriers * plan.extraCourierPrice;
  return <>
    <Subscription onChange={refresh} />
    <div className="pt-card pt-stack">
      <h2>Seu plano</h2>
      <div className="pt-table-wrap"><table className="pt-table">
        <tbody>
          <tr><td>Plano Pitou (até {plan.includedCouriers} entregadores)</td><td className="pt-num">{brl(plan.basePrice)}</td></tr>
          <tr><td>Entregadores adicionais: {plan.extraCouriers} × {brl(plan.extraCourierPrice)}</td><td className="pt-num">{brl(extraTotal)}</td></tr>
          <tr><td>Menu Digital Próprio {plan.menuEnabled ? "(ativo)" : "(desativado)"}</td><td className="pt-num">{brl(plan.menuEnabled ? plan.menuPrice : 0)}</td></tr>
          <tr><td><b>Mensalidade</b></td><td className="pt-num"><b>{brl(plan.monthly)}</b></td></tr>
        </tbody>
      </table></div>
      <div className="pt-row">
        <span className="pt-muted">Vagas adicionais de entregador:</span>
        <button className="pt-btn pt-btn-light pt-btn-sm" disabled={busy || plan.extraCouriers === 0} onClick={() => save({ extra_couriers: plan.extraCouriers - 1 }, "Vaga removida.")}>− Remover vaga</button>
        <b>{plan.extraCouriers}</b>
        <button className="pt-btn pt-btn-light pt-btn-sm" disabled={busy} onClick={() => save({ extra_couriers: plan.extraCouriers + 1 }, "Vaga adicionada.")}>+ Adicionar vaga</button>
      </div>
      <p className="pt-small pt-muted">Sem fidelidade. Cancele quando quiser e pague somente enquanto utilizar. Mudanças nas vagas ou no Menu Digital ajustam o valor da assinatura a partir da próxima cobrança.</p>
    </div>
    <form className="pt-card pt-stack" onSubmit={profile}>
      <h2>Dados do estabelecimento</h2>
      <div className="pt-form-grid">
        <label className="pt-field"><span>Nome</span><input name="name" required minLength={2} defaultValue={e.name} /></label>
        <label className="pt-field"><span>Telefone / WhatsApp</span><input name="phone" inputMode="tel" defaultValue={e.phone || ""} /></label>
      </div>
      <label className="pt-field"><span>Endereço (ponto de saída das entregas)</span><input name="address" defaultValue={e.address || ""} placeholder="Rua, número, bairro, cidade" /></label>
      <div className="pt-row">
        <button type="button" className="pt-btn pt-btn-light pt-btn-sm" onClick={locate}><MapPin size={16} /> Usar minha localização atual</button>
        <span className="pt-small pt-muted">{point ? "Localização capturada. Salve para gravar." : e.latitude != null ? "Localização no mapa definida." : "Sem localização no mapa ainda."}</span>
      </div>
      {saved && <p className="pt-success">{saved}</p>}
      {error && <p className="pt-error" role="alert">{error}</p>}
      <button className="pt-btn" disabled={busy}>Salvar dados</button>
    </form>
    <div className="pt-card pt-stack">
      <h2>Acesso</h2>
      <p className="pt-muted">{user.name} · {user.email}</p>
    </div>
  </>;
}
