// Teste de ponta a ponta da assinatura: teste grátis, bloqueio, pagamento pelo Mercado Pago, webhook,
// mudança de valor, cancelamento, conta de administrador e cardápio público.
// Roda só localmente, com um Mercado Pago falso e um Postgres local (precisa do psql):
//   E2E_BASE_URL=http://localhost:3000 E2E_MP_URL=http://localhost:4445 E2E_PSQL_URL=postgresql://... \
//   E2E_WEBHOOK_SECRET=<o mesmo MERCADOPAGO_WEBHOOK_SECRET do servidor> E2E_ADMIN_EMAIL=<um dos PITOU_ADMIN_EMAILS> \
//   node scripts/e2e-assinatura.mjs
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";

const base = (process.env.E2E_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const mpUrl = process.env.E2E_MP_URL || "http://localhost:4445";
const psqlUrl = process.env.E2E_PSQL_URL;
const secret = process.env.E2E_WEBHOOK_SECRET || "";
const adminEmail = process.env.E2E_ADMIN_EMAIL || "";
if (!/localhost|127\.0\.0\.1/.test(base) || !psqlUrl) {
  console.error("Recusado: este teste só roda localmente e precisa de E2E_PSQL_URL.");
  process.exit(1);
}
const psql = sql => execFileSync("psql", [psqlUrl, "-qtA", "-v", "ON_ERROR_STOP=1", "-c", sql], { encoding: "utf8" }).trim();
let passed = 0, failed = 0;

function client() {
  let cookie = "";
  return async function call(path, { method, body } = {}) {
    const res = await fetch(base + path, {
      method: method || (body ? "POST" : "GET"),
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { cookie } : {}), Origin: base },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    return { status: res.status, data: await res.json().catch(() => ({})) };
  };
}
async function step(name, fn) {
  try { await fn(); passed++; console.log("PASS", name); }
  catch (err) { failed++; console.error("FAIL", name, "\n  ", err.message); }
}
async function webhook(type, id, { sign = true, requestId = "req-" + Date.now() } = {}) {
  const ts = String(Math.floor(Date.now() / 1000));
  const v1 = createHmac("sha256", secret).update(`id:${id};request-id:${requestId};ts:${ts};`).digest("hex");
  const res = await fetch(`${base}/api/billing/webhook?data.id=${id}&type=${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-request-id": requestId, "x-signature": `ts=${ts},v1=${sign ? v1 : "0".repeat(64)}` },
    body: JSON.stringify({ type, action: "updated", data: { id } }),
  });
  return res.status;
}

const owner = client();
const stamp = Date.now();
const email = `assinatura+${stamp}@pitou.test`;
let eid = "", slug = "", preId = "";

await step("Conta nova entra no teste grátis", async () => {
  const r = await owner("/api/auth/signup", { body: { name: "Bia", restaurant: "Pizza Teste", email, password: "senha-forte-123" } });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  const me = await owner("/api/auth/me");
  eid = me.data.establishment.id; slug = me.data.establishment.slug;
  assert.equal(me.data.access.reason, "trial");
  const p = await owner("/api/painel");
  assert.equal(p.status, 200);
  assert.equal(p.data.access.reason, "trial");
});
await step("Cardápio fica público durante o teste", async () => {
  assert.equal((await owner("/api/painel/settings", { method: "PATCH", body: { menu_enabled: true } })).status, 200);
  assert.equal((await fetch(`${base}/m/${slug}`)).status, 200);
});
await step("Fim do teste bloqueia painel e cardápio, mas não a tela de assinatura", async () => {
  psql(`UPDATE establishments SET trial_ends_at=now()-interval '1 minute' WHERE id='${eid}'`);
  const p = await owner("/api/painel");
  assert.equal(p.status, 402);
  assert.equal(p.data.code, "payment_required");
  assert.equal((await owner("/api/painel/couriers", { body: { name: "Zé" } })).status, 402);
  assert.equal((await fetch(`${base}/m/${slug}`)).status, 404);
  const b = await owner("/api/painel/billing");
  assert.equal(b.status, 200);
  assert.equal(b.data.access.active, false);
  assert.equal(b.data.paymentsConfigured, true);
  assert.equal(b.data.plan.monthly, 348.9);
});
await step("Assinar cria a assinatura no Mercado Pago com o valor certo e não libera antes do pagamento", async () => {
  const r = await owner("/api/painel/billing/subscribe", { body: { payer_email: "Pagador@Teste.com", extra_couriers: 2, menu_enabled: true } });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.match(r.data.init_point, /^https:\/\/www\.mercadopago\.com\.br\//);
  assert.equal(r.data.amount, 448.9);
  const calls = await (await fetch(mpUrl + "/__test/calls")).json();
  const created = calls.filter(c => c.method === "POST" && c.url === "/preapproval").at(-1);
  assert.equal(created.body.external_reference, eid);
  assert.equal(created.body.payer_email, "pagador@teste.com");
  assert.equal(created.body.auto_recurring.transaction_amount, 448.9);
  assert.equal(created.body.auto_recurring.frequency_type, "months");
  assert.equal(created.body.auto_recurring.currency_id, "BRL");
  assert.equal(created.body.back_url, base + "/painel?assinatura=retorno");
  preId = new URL(r.data.init_point).searchParams.get("preapproval_id");
  assert.equal((await owner("/api/painel")).status, 402);
});
await step("Webhook com assinatura inválida é recusado", async () => {
  await fetch(`${mpUrl}/__test/pay/${preId}`);
  assert.equal(await webhook("subscription_preapproval", preId, { sign: false }), 401);
  assert.equal((await owner("/api/painel")).status, 402);
});
await step("Webhook válido libera o painel após o pagamento", async () => {
  assert.equal(await webhook("subscription_preapproval", preId), 200);
  const p = await owner("/api/painel");
  assert.equal(p.status, 200);
  assert.equal(p.data.access.reason, "paid");
  assert.equal(p.data.subscription.status, "authorized");
  assert.equal(p.data.subscription.amount, 448.9);
  assert.ok(new Date(p.data.subscription.paidUntil) > new Date(Date.now() + 25 * 864e5));
  assert.equal(p.data.plan.extraCouriers, 2);
  assert.equal((await fetch(`${base}/m/${slug}`)).status, 200);
});
await step("Não deixa assinar de novo com assinatura ativa", async () => {
  assert.equal((await owner("/api/painel/billing/subscribe", { body: {} })).status, 409);
});
await step("Mudar vagas atualiza o valor no Mercado Pago", async () => {
  const r = await owner("/api/painel/settings", { method: "PATCH", body: { extra_couriers: 3 } });
  assert.equal(r.status, 200);
  assert.equal(r.data.billing, "updated");
  const pre = await (await fetch(`${mpUrl}/preapproval/${preId}`, { headers: { Authorization: "Bearer TEST-fake-token" } })).json();
  assert.equal(pre.auto_recurring.transaction_amount, 498.9);
  assert.equal((await owner("/api/painel/billing")).data.subscription.amount, 498.9);
});
await step("Cancelar mantém o acesso até o fim do mês pago", async () => {
  const r = await owner("/api/painel/billing/cancel", { body: {} });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.status, "cancelled");
  const b = await owner("/api/painel/billing");
  assert.equal(b.data.subscription.status, "cancelled");
  assert.equal(b.data.access.active, true);
  assert.equal((await owner("/api/painel")).status, 200);
});
await step("Depois do mês pago, o painel bloqueia de novo", async () => {
  psql(`UPDATE establishments SET paid_until=now()-interval '1 minute' WHERE id='${eid}'`);
  assert.equal((await owner("/api/painel")).status, 402);
});
await step("Webhook de pagamento recorrente é aceito e id desconhecido é ignorado", async () => {
  assert.equal(await webhook("subscription_preapproval", "nao-existe"), 200);
  const events = Number(psql(`SELECT count(*) FROM billing_events WHERE establishment_id='${eid}'`));
  assert.ok(events >= 3, `eventos: ${events}`);
});
await step("Conta de cortesia entra sem pagar", async () => {
  psql(`UPDATE establishments SET billing_exempt=true WHERE id='${eid}'`);
  const p = await owner("/api/painel");
  assert.equal(p.status, 200);
  assert.equal(p.data.access.reason, "exempt");
  psql(`UPDATE establishments SET billing_exempt=false WHERE id='${eid}'`);
});
if (adminEmail) await step("E-mail de administrador entra sem pagar, mesmo sem teste grátis", async () => {
  const admin = client();
  let r = await admin("/api/auth/signup", { body: { name: "Dono", restaurant: "Pitou Admin " + stamp, email: adminEmail, password: "senha-forte-123" } });
  if (r.status === 409) r = await admin("/api/auth/login", { body: { email: adminEmail, password: "senha-forte-123" } });
  assert.ok(r.status === 201 || r.status === 200, JSON.stringify(r.data));
  const me = await admin("/api/auth/me");
  psql(`UPDATE establishments SET trial_ends_at=now()-interval '1 day' WHERE id='${me.data.establishment.id}'`);
  const p = await admin("/api/painel");
  assert.equal(p.status, 200);
  assert.equal(p.data.access.reason, "admin");
});

console.log(`\n${passed} passaram, ${failed} falharam`);
process.exit(failed ? 1 : 0);
