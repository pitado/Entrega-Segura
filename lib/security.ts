const COOKIE = "entrega_admin";
const LIFE = 12 * 60 * 60;
const encoder = new TextEncoder();
async function digest(input: string) {
  const bytes = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,"0")).join("");
}
function equalHex(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i=0;i<a.length;i++) diff |= a.charCodeAt(i) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const result = await crypto.subtle.sign("HMAC",key,encoder.encode(value));
  return Array.from(new Uint8Array(result)).map(x=>x.toString(16).padStart(2,"0")).join("");
}
export async function newAdminSession(password: string) {
  const secret = process.env.MVP_ADMIN_PASSWORD;
  if (!secret || !equalHex(await digest(password),await digest(secret))) return null;
  const issued = String(Math.floor(Date.now()/1000));
  return issued + "." + await sign(issued,secret);
}
export async function isAdmin(req: Request) {
  const secret=process.env.MVP_ADMIN_PASSWORD;
  if (!secret) return false;
  const cookies=req.headers.get("cookie")||"";
  const value=cookies.split(";").map(x=>x.trim()).find(x=>x.startsWith(COOKIE+"="))?.slice(COOKIE.length+1) || "";
  const [issued,mac]=value.split(".");
  if (!issued || !mac || !/^\d{10}$/.test(issued)) return false;
  const age=Math.floor(Date.now()/1000)-Number(issued);
  return age>=0 && age<LIFE && equalHex(mac,await sign(issued,secret));
}
export async function hashToken(token: string) { return digest(token); }
export function validUuid(v: unknown): v is string {
  return typeof v==="string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}
export function validAccessToken(v: unknown): v is string {return typeof v==="string" && /^[a-f0-9]{64}$/.test(v);}
export function originAllowed(req: Request) {const o=req.headers.get("origin"); return !o || o===new URL(req.url).origin;}
export const SESSION_COOKIE=COOKIE;
export const SESSION_LIFE=LIFE;
