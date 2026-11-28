import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "../../../lib/db";
import { validSlug } from "../../../lib/slug";
import { accessFor, billingColumns } from "../../../lib/billing";
import MenuView, { type MenuProduct } from "./MenuView";
import "../../app.css";

export const dynamic = "force-dynamic";

type Establishment = { id: string; name: string; logo_url: string | null; brand_color: string | null; menu_description: string | null; phone: string | null; address: string | null };

const load = cache(async (slug: string) => {
  if (!validSlug(slug)) return null;
  const sql = db();
  const rows = await sql.query(
    `SELECT e.id,e.name,e.logo_url,e.brand_color,e.menu_description,e.phone,e.address,${billingColumns},
       (SELECT u.email FROM establishment_users u WHERE u.establishment_id=e.id AND u.role='owner' ORDER BY u.created_at LIMIT 1) AS owner_email
     FROM establishments e WHERE e.slug=$1 AND e.menu_enabled=true LIMIT 1`, [slug]);
  const row = rows[0];
  // Cardápio só fica no ar enquanto a assinatura (ou teste/cortesia) estiver ativa.
  if (!row || !accessFor(row as never, String(row.owner_email || "")).active) return null;
  const establishment: Establishment = {
    id: row.id, name: row.name, logo_url: row.logo_url, brand_color: row.brand_color,
    menu_description: row.menu_description, phone: row.phone, address: row.address,
  };
  const products = await sql.query(
    `SELECT id,name,description,category,price::float8 AS price,photo_url FROM menu_products
     WHERE establishment_id=$1 AND available=true ORDER BY category NULLS LAST,position,name`, [establishment.id]) as MenuProduct[];
  return { establishment, products };
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const data = await load((await params).slug).catch(() => null);
  if (!data) return { title: { absolute: "Cardápio · Pitou" }, robots: { index: false } };
  return {
    title: { absolute: `${data.establishment.name} · Cardápio` },
    description: data.establishment.menu_description || `Cardápio de ${data.establishment.name}`,
    robots: { index: false, follow: false },
  };
}

export default async function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const data = await load((await params).slug);
  if (!data) notFound();
  const { establishment: e, products } = data;
  return <main className="pt" style={{ ["--brand" as string]: e.brand_color || "#141414" }}>
    <header className="pt-menu-hero">
      <div className="pt-menu-hero-inner">
        {e.logo_url && <img src={e.logo_url} alt={"Logo " + e.name} />}
        <div className="pt-stack" style={{ gap: 6 }}>
          <h1>{e.name}</h1>
          {e.menu_description && <p style={{ opacity: .9 }}>{e.menu_description}</p>}
          {e.address && <p className="pt-small" style={{ opacity: .8 }}>{e.address}</p>}
        </div>
      </div>
    </header>
    <MenuView products={products} whatsapp={e.phone} name={e.name} />
  </main>;
}
