import { db } from "../../../../lib/db";
import { digits, fail, ok, readJson, text } from "../../../../lib/http";
import { withAccount } from "../../../../lib/panel";
import { hashToken, randomToken } from "../../../../lib/security";
import { pricing } from "../../../pricing";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return withAccount(req, async ({ establishment }) => {
    const body = await readJson(req);
    const name = text(body.name, 80), phone = digits(body.phone);
    if (name.length < 2) return fail("Informe o nome do entregador");
    const sql = db();
    const token = randomToken();
    // Cria o entregador só se ainda houver vaga no plano (5 incluídos + adicionais contratados).
    const rows = await sql.query(
      `INSERT INTO couriers(establishment_id,name,phone)
       SELECT e.id,$2,$3 FROM establishments e
       WHERE e.id=$1 AND (SELECT count(*) FROM couriers c WHERE c.establishment_id=e.id AND c.active AND c.demo_session_id IS NULL) < $4+e.extra_couriers
       RETURNING id,name`, [establishment.id, name, phone || null, pricing.includedCouriers]);
    if (!rows.length) return fail("Você já usa todas as vagas de entregador do plano.", 409, { code: "courier_limit" });
    await sql.query("INSERT INTO courier_access_tokens(courier_id,token_hash) VALUES($1,$2)", [rows[0].id, await hashToken(token)]);
    return ok({ courier: rows[0], courier_url: new URL("/entregador/" + token, req.url).toString() }, 201);
  });
}
