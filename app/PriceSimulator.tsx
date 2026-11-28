"use client";

import { useId, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { estimateMonthly, pricing } from "./pricing";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function PriceSimulator() {
  const [couriers, setCouriers] = useState<number>(pricing.includedCouriers);
  const [menu, setMenu] = useState(false);
  const menuId = useId();
  const extra = Math.max(0, couriers - pricing.includedCouriers);
  const total = estimateMonthly(couriers, menu);
  const change = (delta: number) => setCouriers(n => Math.min(pricing.maxSimulatedCouriers, Math.max(1, n + delta)));

  return <div className="lp-sim" aria-labelledby="lp-sim-title">
    <h3 id="lp-sim-title">Simule sua mensalidade</h3>
    <div className="lp-sim-row">
      <span>Entregadores</span>
      <div className="lp-stepper">
        <button type="button" onClick={() => change(-1)} disabled={couriers <= 1} aria-label="Remover entregador"><Minus size={18} /></button>
        <output aria-live="polite">{couriers}</output>
        <button type="button" onClick={() => change(1)} disabled={couriers >= pricing.maxSimulatedCouriers} aria-label="Adicionar entregador"><Plus size={18} /></button>
      </div>
    </div>
    <label className="lp-sim-row lp-sim-toggle" htmlFor={menuId}>
      <span>Menu Digital Próprio</span>
      <input id={menuId} type="checkbox" checked={menu} onChange={e => setMenu(e.target.checked)} />
    </label>
    <dl className="lp-sim-lines">
      <div><dt>Plano Único (até {pricing.includedCouriers} entregadores)</dt><dd>{brl.format(pricing.base)}</dd></div>
      {extra > 0 && <div><dt>{extra} entregador{extra > 1 ? "es" : ""} adiciona{extra > 1 ? "is" : "l"}</dt><dd>{brl.format(extra * pricing.extraCourier)}</dd></div>}
      {menu && <div><dt>Menu Digital Próprio</dt><dd>{brl.format(pricing.menu)}</dd></div>}
      <div className="lp-sim-total"><dt>Total por mês</dt><dd>{brl.format(total)}</dd></div>
    </dl>
  </div>;
}
