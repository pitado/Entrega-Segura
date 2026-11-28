import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { hashPassword, startSession } from "../../../../lib/auth";
import { fail, readJson, text, digits, privateHeaders } from "../../../../lib/http";
import { originAllowed, safeEqual } from "../../../../lib/security";
import { slugify } from "../../../../lib/slug";

export const runtime = "nodejs";
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

export async function POST(req: Request) {
  if (!originAllowed(req)) return fail("Origem não autorizada", 403);
  const body = await readJson(req);
  const name = text(body.name, 80), restaurant = text(body.restaurant, 90), email = text(body.email, 160).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "", phone = digits(body.phone);
  const inviteCode = process.env.PITOU_SIGNUP_CODE;
  if (inviteCode && !safeEqual(text(body.invite, 80), inviteCode)) return fail("Código de convite inválido. Fale com a equipe Pitou.", 403);
  if (name.length < 2) return fail("Informe seu nome");
  if (restaurant.length < 2) return fail("Informe o nome do estabelecimento");
  if (!emailOk(email)) return fail("E-mail inválido");
  if (password.length < 8 || password.length > 200) return fail("A senha precisa ter pelo menos 8 caracteres");
  try {
    const sql = db();
    const taken = await sql.query("SELECT 1 FROM establishment_users WHERE lower(email)=$1", [email]);
    if (taken.length) return fail("Já existe uma conta com este e-mail. Entre com sua senha.", 409);
    const base = slugify(restaurant);
    const used = await sql.query("SELECT slug FROM establishments WHERE slug=$1 OR slug LIKE $2", [base, base + "-%"]);
    const slugs = new Set(used.map(r => String(r.slug)));
    let slug = base, n = 2;
    while (slugs.has(slug)) slug = `${base}-${n++}`;
    const passwordHash = await hashPassword(password);
    const rows = await sql.query(
      `WITH e AS (INSERT INTO establishments(name,slug,phone) VALUES($1,$2,$3) RETURNING id)
       INSERT INTO establishment_users(establishment_id,name,email,password_hash,role)
       SELECT id,$4,$5,$6,'owner' FROM e RETURNING id`,
      [restaurant, slug, phone || null, name, email, passwordHash]);
    const res = NextResponse.json({ ok: true }, { status: 201, headers: privateHeaders });
    await startSession(res, String(rows[0].id));
    return res;
  } catch (err) {
    if (String((err as { code?: string })?.code) === "23505") return fail("Este e-mail ou endereço já está em uso", 409);
    return fail("Não foi possível criar a conta agora. Tente novamente.", 503);
  }
}

export async function GET() {
  return NextResponse.json({ inviteRequired: Boolean(process.env.PITOU_SIGNUP_CODE) }, { headers: privateHeaders });
}
