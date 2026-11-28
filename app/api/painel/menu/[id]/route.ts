import { db } from "../../../../../lib/db";
import { fail, ok, readJson } from "../../../../../lib/http";
import { withAccount } from "../../../../../lib/panel";
import { validUuid } from "../../../../../lib/security";
import { productFields } from "../../../../../lib/menu";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Context) {
  return withAccount(req, async ({ establishment }) => {
    const id = (await params).id;
    if (!validUuid(id)) return fail("Produto inválido");
    const body = await readJson(req);
    const sql = db();
    if (Object.keys(body).length === 1 && "available" in body) {
      const rows = await sql.query("UPDATE menu_products SET available=$1,updated_at=now() WHERE id=$2 AND establishment_id=$3 RETURNING id", [Boolean(body.available), id, establishment.id]);
      return rows.length ? ok({ ok: true }) : fail("Produto não encontrado", 404);
    }
    const f = productFields(body);
    if ("error" in f) return fail(f.error as string);
    const rows = await sql.query(
      `UPDATE menu_products SET name=$1,description=$2,category=$3,price=$4,photo_url=$5,available=$6,updated_at=now()
       WHERE id=$7 AND establishment_id=$8 RETURNING id`,
      [f.name, f.description, f.category, f.price, f.photo, f.available, id, establishment.id]);
    return rows.length ? ok({ ok: true }) : fail("Produto não encontrado", 404);
  });
}

export async function DELETE(req: Request, { params }: Context) {
  return withAccount(req, async ({ establishment }) => {
    const id = (await params).id;
    if (!validUuid(id)) return fail("Produto inválido");
    const rows = await db().query("DELETE FROM menu_products WHERE id=$1 AND establishment_id=$2 RETURNING id", [id, establishment.id]);
    return rows.length ? ok({ ok: true }) : fail("Produto não encontrado", 404);
  });
}
