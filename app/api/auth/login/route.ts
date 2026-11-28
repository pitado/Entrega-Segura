import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { startSession, verifyPassword } from "../../../../lib/auth";
import { fail, readJson, text, privateHeaders } from "../../../../lib/http";
import { originAllowed } from "../../../../lib/security";

export const runtime = "nodejs";
const MAX_FAILURES = 8;

export async function POST(req: Request) {
  if (!originAllowed(req)) return fail("Origem não autorizada", 403);
  const body = await readJson(req);
  const email = text(body.email, 160).toLowerCase();
  const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";
  if (!email || !password) return fail("Informe e-mail e senha");
  try {
    const sql = db();
    const recent = await sql.query("SELECT count(*)::int AS n FROM login_failures WHERE lower(email)=$1 AND created_at>now()-interval '15 minutes'", [email]);
    if (Number(recent[0]?.n) >= MAX_FAILURES) return fail("Muitas tentativas. Aguarde 15 minutos e tente de novo.", 429);
    const users = await sql.query("SELECT id,password_hash FROM establishment_users WHERE lower(email)=$1 LIMIT 1", [email]);
    const valid = users.length ? await verifyPassword(password, String(users[0].password_hash)) : false;
    if (!valid) {
      await sql.query("INSERT INTO login_failures(email) VALUES($1)", [email]);
      await sql.query("DELETE FROM login_failures WHERE created_at<now()-interval '1 day'", []);
      return fail("E-mail ou senha incorretos", 401);
    }
    await sql.query("UPDATE establishment_users SET last_login_at=now() WHERE id=$1", [users[0].id]);
    await sql.query("DELETE FROM login_failures WHERE lower(email)=$1", [email]);
    const res = NextResponse.json({ ok: true }, { headers: privateHeaders });
    await startSession(res, String(users[0].id));
    return res;
  } catch { return fail("Serviço indisponível. Tente novamente.", 503); }
}
