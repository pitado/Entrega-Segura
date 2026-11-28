import { db } from "../../../../lib/db";
import { coordinate, digits, fail, httpsUrl, money, ok, readJson, text } from "../../../../lib/http";
import { geocode } from "../../../../lib/orders";
import { withAccount } from "../../../../lib/panel";
import { validSlug } from "../../../../lib/slug";
import { pricing } from "../../../pricing";

export const runtime = "nodejs";

// Atualiza perfil, cashback, cardápio e entregadores adicionais. Só os campos enviados mudam.
export async function PATCH(req: Request) {
  return withAccount(req, async ({ establishment }) => {
    const body = await readJson(req);
    const sql = db();
    const eid = establishment.id;
    const sets: string[] = [];
    const args: unknown[] = [];
    const set = (column: string, value: unknown) => { args.push(value); sets.push(`${column}=$${args.length}`); };

    if ("name" in body) {
      const name = text(body.name, 90);
      if (name.length < 2) return fail("Informe o nome do estabelecimento");
      set("name", name);
    }
    if ("phone" in body) set("phone", digits(body.phone) || null);
    if ("address" in body) {
      const address = text(body.address, 240);
      set("address", address || null);
      const given = coordinate(body.latitude, body.longitude);
      const current = await sql.query("SELECT address FROM establishments WHERE id=$1", [eid]);
      // Mantém o ponto do mapa se o endereço não mudou; se mudou, tenta geocodificar (Mapbox) ou limpa.
      if (given || (current[0]?.address || "") !== address) {
        const point = given ?? (address ? await geocode(address) : null);
        set("latitude", point?.lat ?? null);
        set("longitude", point?.lng ?? null);
      }
    }
    if ("slug" in body) {
      const slug = text(body.slug, 40).toLowerCase();
      if (!validSlug(slug)) return fail("Use de 3 a 40 letras minúsculas, números ou hífens no link do cardápio");
      const taken = await sql.query("SELECT 1 FROM establishments WHERE slug=$1 AND id<>$2", [slug, eid]);
      if (taken.length) return fail("Este link já está em uso por outro estabelecimento", 409);
      set("slug", slug);
    }
    if ("logo_url" in body) {
      const logo = body.logo_url ? httpsUrl(body.logo_url) : null;
      if (body.logo_url && !logo) return fail("O logo precisa ser um link https://");
      set("logo_url", logo);
    }
    if ("brand_color" in body) {
      const color = text(body.brand_color, 7);
      if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) return fail("Cor inválida");
      set("brand_color", color || null);
    }
    if ("menu_description" in body) set("menu_description", text(body.menu_description, 300) || null);
    if ("menu_enabled" in body) set("menu_enabled", Boolean(body.menu_enabled));
    if ("cashback_percent" in body) {
      const pct = money(body.cashback_percent);
      if (pct === null || pct > 50) return fail("O cashback deve ficar entre 0% e 50%");
      set("cashback_percent", pct);
    }
    if ("cashback_min_order" in body) {
      const min = money(body.cashback_min_order);
      if (min === null) return fail("Valor mínimo inválido");
      set("cashback_min_order", min);
    }
    if ("extra_couriers" in body) {
      const extra = Number(body.extra_couriers);
      if (!Number.isInteger(extra) || extra < 0 || extra > 500) return fail("Quantidade de entregadores adicionais inválida");
      const active = await sql.query("SELECT count(*)::int AS n FROM couriers WHERE establishment_id=$1 AND active AND demo_session_id IS NULL", [eid]);
      if (Number(active[0].n) > pricing.includedCouriers + extra)
        return fail(`Você tem ${active[0].n} entregadores ativos. Desative alguns antes de reduzir as vagas.`, 409);
      set("extra_couriers", extra);
    }
    if (!sets.length) return fail("Nada para atualizar");
    args.push(eid);
    await sql.query(`UPDATE establishments SET ${sets.join(",")},updated_at=now() WHERE id=$${args.length}`, args);
    return ok({ ok: true });
  });
}
