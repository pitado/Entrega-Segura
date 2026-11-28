"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { brl, whatsappUrl } from "../../components/client";
import PitouLogo from "../../components/PitouLogo";

export type MenuProduct = { id: string; name: string; description: string | null; category: string | null; price: number; photo_url: string | null };

export default function MenuView({ products, whatsapp, name }: { products: MenuProduct[]; whatsapp: string | null; name: string }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category || "Outros"))), [products]);
  const items = products.filter(p => cart[p.id]);
  const total = items.reduce((s, p) => s + p.price * cart[p.id], 0);
  const count = items.reduce((s, p) => s + cart[p.id], 0);
  const change = (id: string, d: number) => setCart(c => { const n = Math.max(0, (c[id] || 0) + d); const next = { ...c, [id]: n }; if (!n) delete next[id]; return next; });
  const message = `Olá, ${name}! Quero fazer um pedido:\n` + items.map(p => `${cart[p.id]}x ${p.name} (${brl(p.price * cart[p.id])})`).join("\n") + `\nTotal: ${brl(total)}`;
  const slug = (c: string) => "cat-" + c.normalize("NFD").replace(/[^\w]+/g, "-").toLowerCase();

  return <div className="pt-menu-body">
    {categories.length > 1 && <nav className="pt-menu-cats" aria-label="Categorias">{categories.map(c => <a key={c} href={"#" + slug(c)}>{c}</a>)}</nav>}
    {products.length === 0 && <div className="pt-card pt-empty">O cardápio está sendo preparado. Volte em breve!</div>}
    {categories.map(c => <section key={c} id={slug(c)} className="pt-stack" style={{ scrollMarginTop: 60 }}>
      <h2>{c}</h2>
      <div className="pt-products">
        {products.filter(p => (p.category || "Outros") === c).map(p => <article key={p.id} className="pt-product">
          {p.photo_url && <img src={p.photo_url} alt={p.name} loading="lazy" />}
          <div className="pt-product-info">
            <h3>{p.name}</h3>
            {p.description && <p>{p.description}</p>}
            <div className="pt-between">
              <span className="pt-price">{brl(p.price)}</span>
              {whatsapp && (cart[p.id]
                ? <span className="pt-qty"><button className="pt-icon-btn" aria-label={"Remover " + p.name} onClick={() => change(p.id, -1)}><Minus size={16} /></button>{cart[p.id]}<button className="pt-icon-btn" aria-label={"Adicionar " + p.name} onClick={() => change(p.id, 1)}><Plus size={16} /></button></span>
                : <button className="pt-btn pt-btn-light pt-btn-sm" onClick={() => change(p.id, 1)}><Plus size={15} /> Adicionar</button>)}
            </div>
          </div>
        </article>)}
      </div>
    </section>)}
    {whatsapp && count > 0 && <div className="pt-cart-bar">
      <a className="pt-btn pt-btn-block pt-btn-green" style={{ minHeight: 52 }} target="_blank" rel="noreferrer" href={whatsappUrl(whatsapp, message)}>
        <ShoppingBag size={18} /> Pedir pelo WhatsApp · {count} {count === 1 ? "item" : "itens"} · {brl(total)}
      </a>
    </div>}
    <p className="pt-footer-note">Cardápio digital por <a href="/" aria-label="Pitou"><PitouLogo size={18} /></a></p>
  </div>;
}
