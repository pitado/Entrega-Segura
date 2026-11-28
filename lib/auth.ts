import { NextResponse } from "next/server";
import { db } from "./db";
import { randomToken, safeEqual, sha256 } from "./security";

export const SESSION_COOKIE = "pitou_session";
const SESSION_DAYS = 30;
// O runtime do Cloudflare Workers aceita no máximo 100 mil iterações de PBKDF2.
const ITERATIONS = 100_000;
const encoder = new TextEncoder();

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations }, key, 256);
  return new Uint8Array(bits);
}
export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return ["pbkdf2", ITERATIONS, b64(salt), b64(await pbkdf2(password, salt, ITERATIONS))].join("$");
}
export async function verifyPassword(password: string, stored: string) {
  const [scheme, iter, salt, hash] = stored.split("$");
  const iterations = Number(iter);
  if (scheme !== "pbkdf2" || !Number.isInteger(iterations) || iterations < 1 || iterations > ITERATIONS || !salt || !hash) return false;
  const derived = await pbkdf2(password, unb64(salt), iterations);
  return safeEqual(b64(derived), hash);
}

export type Account = {
  user: { id: string; name: string; email: string; role: string };
  establishment: { id: string; name: string; slug: string | null };
};

function readCookie(req: Request, name: string) {
  const raw = req.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return "";
}

export async function currentAccount(req: Request): Promise<Account | null> {
  const token = readCookie(req, SESSION_COOKIE);
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const rows = await db().query(
    `SELECT u.id AS user_id,u.name AS user_name,u.email,u.role,e.id AS establishment_id,e.name AS establishment_name,e.slug
       FROM user_sessions s JOIN establishment_users u ON u.id=s.user_id JOIN establishments e ON e.id=u.establishment_id
      WHERE s.token_hash=$1 AND s.expires_at>now() LIMIT 1`, [await sha256(token)]);
  const r = rows[0];
  if (!r) return null;
  return {
    user: { id: r.user_id, name: r.user_name, email: r.email, role: r.role },
    establishment: { id: r.establishment_id, name: r.establishment_name, slug: r.slug },
  };
}

const cookieOptions = (maxAge: number) => ({
  httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge,
});

export async function startSession(res: NextResponse, userId: string) {
  const token = randomToken();
  const sql = db();
  await sql.query("INSERT INTO user_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+make_interval(days=>$3))", [await sha256(token), userId, SESSION_DAYS]);
  await sql.query("DELETE FROM user_sessions WHERE user_id=$1 AND expires_at<now()", [userId]);
  res.cookies.set(SESSION_COOKIE, token, cookieOptions(SESSION_DAYS * 86400));
}

export async function endSession(req: Request, res: NextResponse) {
  const token = readCookie(req, SESSION_COOKIE);
  if (/^[a-f0-9]{64}$/.test(token)) await db().query("DELETE FROM user_sessions WHERE token_hash=$1", [await sha256(token)]);
  res.cookies.set(SESSION_COOKIE, "", cookieOptions(0));
}
