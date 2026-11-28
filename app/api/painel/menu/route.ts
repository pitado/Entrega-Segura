import { db } from "../../../../lib/db";
import { fail, ok, readJson } from "../../../../lib/http";
import { productFields } from "../../../../lib/menu";
import { withAccount } from "../../../../lib/panel";

export const runtime = "nodejs";
const MAX_PRODUCTS = 300;

export async function GET(req: Request) {
  return withAccount(req, async ({ establishment }) => {
    const rows = await db().query(
      `SELECT id,name,description,category,price::float8 AS price,photo_url,available,position
       FROM menu_products WHERE establishment_id=$1 ORDER BY category NULLS LAST,position,name`, [establishment.id]);
    return ok({ products: rows });
  });
}

export async function POST(req: Request) {
  return withAccount(req, async ({ establishment }) => {
    const f = productFields(await readJson(req));
    if ("error" in f) return fail(f.error as string);
    const rows = await db().query(
      `INSERT INTO menu_products(establishment_id,name,description,category,price,photo_url,available,position)
       SELECT $1,$2,$3,$4,$5,$6,$7,coalesce(max(position),0)+1 FROM menu_products WHERE establishment_id=$1
       HAVING count(*)<$8 RETURNING id`,
      [establishment.id, f.name, f.description, f.category, f.price, f.photo, f.available, MAX_PRODUCTS]);
    if (!rows.length) return fail(`Limite de ${MAX_PRODUCTS} produtos atingido`, 409);
    return ok({ id: rows[0].id }, 201);
  });
}
