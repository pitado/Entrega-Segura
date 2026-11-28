"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Copy, ExternalLink, Plus } from "lucide-react";
import { api, brl } from "../components/client";
import type { Overview } from "./types";

type Product = { id: string; name: string; description: string | null; category: string | null; price: number; photo_url: string | null; available: boolean };

export default function MenuTab({ data, refresh }: { data: Overview; refresh: () => Promise<void> }) {
  const { establishment: e, plan } = data;
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const menuUrl = typeof window === "undefined" ? "" : `${location.origin}/m/${e.slug}`;

  const load = useCallback(() => api<{ products: Product[] }>("/api/painel/menu").then(r => setProducts(r.products)).catch(err => setError(err.message)), []);
  useEffect(() => { load(); }, [load]);

  async function settings(body: Record<string, unknown>) {
    setBusy(true); setError("");
    try { await api("/api/painel/settings", { method: "PATCH", body }); await refresh(); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  async function toggle(p: Product) {
    await api(`/api/painel/menu/${p.id}`, { method: "PATCH", body: { available: !p.available } }).catch(err => setError(err.message));
    load();
  }
  async function remove(p: Product) {
    await api(`/api/painel/menu/${p.id}`, { method: "DELETE" }).catch(err => setError(err.message));
    setEditing(null);
    load();
  }

  const categories = Array.from(new Set(products.map(p => p.category || "Outros")));

  return <>
    <div className="pt-card pt-stack">
      <div className="pt-between">
        <div>
          <h2>Cardápio digital</h2>
          <p className="pt-muted" style={{ marginTop: 4 }}>Adicional de {brl(plan.menuPrice)}/mês: cardápio com o seu logo, produtos, fotos, preços e link exclusivo.</p>
        </div>
        {e.menu_enabled ? <button className="pt-btn pt-btn-light" disabled={busy} onClick={() => settings({ menu_enabled: false })}>Desativar cardápio</button>
          : <button className="pt-btn" disabled={busy} onClick={() => settings({ menu_enabled: true })}>Ativar cardápio (+{brl(plan.menuPrice)}/mês)</button>}
      </div>
      {e.menu_enabled ? <div className="pt-copy">
        <input className="pt-input" readOnly value={menuUrl} aria-label="Link do cardápio" onFocus={ev => ev.currentTarget.select()} />
        <button className="pt-btn pt-btn-light pt-btn-sm" onClick={() => navigator.clipboard?.writeText(menuUrl).catch(() => {})}><Copy size={16} /> Copiar</button>
        <a className="pt-btn pt-btn-light pt-btn-sm" href={`/m/${e.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Abrir</a>
      </div> : <p className="pt-notice">Você pode montar o cardápio agora. Ele fica público no seu link quando o adicional estiver ativo.</p>}
      <form className="pt-form-grid" style={{ alignItems: "end" }} onSubmit={ev => { ev.preventDefault(); settings(Object.fromEntries(new FormData(ev.currentTarget))); }}>
        <label className="pt-field"><span>Endereço do link (pitou.com.br/m/…)</span><input name="slug" defaultValue={e.slug || ""} pattern="[a-z0-9][a-z0-9\-]{1,38}[a-z0-9]" title="Letras minúsculas, números e hífen" /></label>
        <label className="pt-field"><span>Logo (link https da imagem)</span><input name="logo_url" type="url" defaultValue={e.logo_url || ""} placeholder="https://…" /></label>
        <label className="pt-field"><span>Cor da marca</span><input name="brand_color" type="color" defaultValue={e.brand_color || "#141414"} style={{ padding: 4 }} /></label>
        <label className="pt-field" style={{ gridColumn: "1 / -1" }}><span>Descrição curta</span><input name="menu_description" defaultValue={e.menu_description || ""} maxLength={300} placeholder="Ex.: Hambúrgueres artesanais. Entregamos das 18h às 23h." /></label>
        <button className="pt-btn pt-btn-light" disabled={busy}>Salvar aparência</button>
      </form>
      {error && <p className="pt-error" role="alert">{error}</p>}
    </div>
    <div className="pt-card pt-stack">
      <div className="pt-between"><h2>Produtos ({products.length})</h2>
        <button className="pt-btn" onClick={() => setEditing("new")}><Plus size={17} /> Adicionar produto</button>
      </div>
      {editing && <ProductForm product={editing === "new" ? null : editing} categories={categories} onDone={() => { setEditing(null); load(); }} onDelete={remove} />}
      {products.length === 0 && !editing && <div className="pt-empty">Nenhum produto cadastrado.</div>}
      {categories.map(cat => <div key={cat} className="pt-stack">
        <p className="pt-section-label">{cat}</p>
        <div className="pt-products">
          {products.filter(p => (p.category || "Outros") === cat).map(p => <div key={p.id} className="pt-product" style={{ border: "1px solid var(--line)", opacity: p.available ? 1 : .6 }}>
            {p.photo_url ? <img src={p.photo_url} alt="" loading="lazy" /> : null}
            <div className="pt-product-info">
              <b>{p.name}</b>
              {p.description && <p>{p.description}</p>}
              <span className="pt-price">{brl(p.price)}</span>
            </div>
            <div className="pt-stack" style={{ gap: 6 }}>
              <button className="pt-btn pt-btn-light pt-btn-sm" onClick={() => setEditing(p)}>Editar</button>
              <button className="pt-btn pt-btn-light pt-btn-sm" onClick={() => toggle(p)}>{p.available ? "Esgotar" : "Disponível"}</button>
            </div>
          </div>)}
        </div>
      </div>)}
    </div>
  </>;
}

function ProductForm({ product, categories, onDone, onDelete }: { product: Product | null; categories: string[]; onDone: () => void; onDelete: (p: Product) => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setBusy(true); setError("");
    const fd = new FormData(ev.currentTarget);
    const body = { ...Object.fromEntries(fd), available: fd.get("available") === "on" };
    try {
      await api(product ? `/api/painel/menu/${product.id}` : "/api/painel/menu", { method: product ? "PATCH" : "POST", body });
      onDone();
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }
  return <form className="pt-stack" onSubmit={submit} style={{ background: "#f6f7fc", borderRadius: 16, padding: 16 }} key={product?.id || "new"}>
    <h3>{product ? "Editar produto" : "Novo produto"}</h3>
    <div className="pt-form-grid">
      <label className="pt-field"><span>Nome</span><input name="name" required minLength={2} maxLength={90} defaultValue={product?.name} /></label>
      <label className="pt-field"><span>Preço (R$)</span><input name="price" required inputMode="decimal" defaultValue={product ? String(product.price).replace(".", ",") : ""} placeholder="0,00" /></label>
      <label className="pt-field"><span>Categoria</span><input name="category" list="pt-categories" maxLength={60} defaultValue={product?.category || ""} placeholder="Ex.: Lanches" />
        <datalist id="pt-categories">{categories.map(c => <option key={c} value={c} />)}</datalist></label>
      <label className="pt-field"><span>Foto (link https da imagem)</span><input name="photo_url" type="url" defaultValue={product?.photo_url || ""} placeholder="https://…" /></label>
    </div>
    <label className="pt-field"><span>Descrição</span><textarea name="description" maxLength={400} defaultValue={product?.description || ""} /></label>
    <label className="pt-check"><input type="checkbox" name="available" defaultChecked={product ? product.available : true} /> Disponível para pedido</label>
    {error && <p className="pt-error" role="alert">{error}</p>}
    <div className="pt-row">
      <button className="pt-btn" disabled={busy}>{product ? "Salvar" : "Adicionar"}</button>
      <button type="button" className="pt-btn pt-btn-light" onClick={onDone}>Cancelar</button>
      {product && <button type="button" className="pt-btn pt-btn-danger" onClick={() => onDelete(product)}>Excluir</button>}
    </div>
  </form>;
}
