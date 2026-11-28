import { db } from "../../../../../lib/db";
import { digits, fail, ok, readJson, text } from "../../../../../lib/http";
import { withAccount } from "../../../../../lib/panel";
import { hashToken, randomToken, validUuid } from "../../../../../lib/security";
import { pricing } from "../../../../pricing";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Context) {
  return withAccount(req, async ({ establishment }) => {
    const id = (await params).id;
    if (!validUuid(id)) return fail("Entregador inválido");
    const body = await readJson(req);
    const sql = db();
    const eid = establishment.id;
    const found = await sql.query("SELECT id,active FROM couriers WHERE id=$1 AND establishment_id=$2 AND demo_session_id IS NULL", [id, eid]);
    if (!found.length) return fail("Entregador não encontrado", 404);

    if (body.action === "edit") {
      const name = text(body.name, 80), phone = digits(body.phone);
      if (name.length < 2) return fail("Informe o nome do entregador");
      await sql.query("UPDATE couriers SET name=$1,phone=$2 WHERE id=$3", [name, phone || null, id]);
      return ok({ ok: true });
    }
    if (body.action === "new_link") {
      if (!found[0].active) return fail("Reative o entregador antes de gerar o link", 409);
      const token = randomToken();
      await sql.query(
        `INSERT INTO courier_access_tokens(courier_id,token_hash,revoked_at) VALUES($1,$2,NULL)
         ON CONFLICT(courier_id) DO UPDATE SET token_hash=excluded.token_hash,created_at=now(),revoked_at=NULL`, [id, await hashToken(token)]);
      return ok({ courier_url: new URL("/entregador/" + token, req.url).toString() });
    }
    if (body.action === "revoke_link") {
      await sql.query("UPDATE courier_access_tokens SET revoked_at=now() WHERE courier_id=$1", [id]);
      return ok({ ok: true });
    }
    if (body.action === "deactivate") {
      const busy = await sql.query("SELECT 1 FROM orders WHERE courier_id=$1 AND status IN ('on_route','arrived') LIMIT 1", [id]);
      if (busy.length) return fail("Este entregador está com uma entrega em rota. Conclua antes de desativar.", 409);
      await sql.query("UPDATE orders SET courier_id=NULL,updated_at=now() WHERE courier_id=$1 AND status='preparing'", [id]);
      await sql.query("UPDATE couriers SET active=false WHERE id=$1", [id]);
      await sql.query("UPDATE courier_access_tokens SET revoked_at=now() WHERE courier_id=$1", [id]);
      return ok({ ok: true });
    }
    if (body.action === "activate") {
      const rows = await sql.query(
        `UPDATE couriers SET active=true WHERE id=$1 AND
           (SELECT count(*) FROM couriers c WHERE c.establishment_id=$2 AND c.active AND c.demo_session_id IS NULL)
           < $3+(SELECT extra_couriers FROM establishments WHERE id=$2) RETURNING id`, [id, eid, pricing.includedCouriers]);
      if (!rows.length) return fail("Você já usa todas as vagas de entregador do plano.", 409, { code: "courier_limit" });
      return ok({ ok: true });
    }
    return fail("Ação desconhecida");
  });
}
