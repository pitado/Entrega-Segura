// Teste de ponta a ponta do painel real: conta, entregadores, pedido, GPS, cashback, histórico e cardápio.
// Cria dados de teste. Use só em ambiente local ou numa branch de desenvolvimento do Neon, nunca em produção.
//   E2E_BASE_URL=http://localhost:3000 node scripts/e2e-painel.mjs
import assert from "node:assert/strict";

const base = (process.env.E2E_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
if (/pitou\.com\.br|workers\.dev/.test(base) && !process.env.E2E_ALLOW_REMOTE) {
  console.error("Recusado: este teste cria contas. Defina E2E_ALLOW_REMOTE=1 se tiver certeza.");
  process.exit(1);
}
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
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  };
}
async function step(name, fn) {
  try { await fn(); passed++; console.log("PASS", name); }
  catch (err) { failed++; console.error("FAIL", name, "\n  ", err.message); }
}

const owner = client(), other = client(), anon = client();
const stamp = Date.now();
const email = `teste+${stamp}@pitou.test`;
let courierToken = "", order = null, orderId = "", trackingToken = "", couriers = [], slug = "";

await step("Painel exige login", async () => {
  assert.equal((await anon("/api/painel")).status, 401);
  assert.equal((await anon("/api/auth/me")).status, 401);
});
await step("Cadastro do estabelecimento", async () => {
  const r = await owner("/api/auth/signup", { body: { name: "Ana Teste", restaurant: "Burguer do Teste", email, password: "senha-forte-123", phone: "(44) 99999-0000" } });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  const me = await owner("/api/auth/me");
  assert.equal(me.status, 200);
  slug = me.data.establishment.slug;
  assert.match(slug, /^burguer-do-teste/);
});
await step("E-mail duplicado é recusado", async () => {
  const r = await anon("/api/auth/signup", { body: { name: "Xavier", restaurant: "Outro", email, password: "outrasenha123" } });
  assert.equal(r.status, 409);
});
await step("Senha errada é recusada e a certa entra", async () => {
  assert.equal((await anon("/api/auth/login", { body: { email, password: "errada" } })).status, 401);
  const c = client();
  assert.equal((await c("/api/auth/login", { body: { email: email.toUpperCase(), password: "senha-forte-123" } })).status, 200);
  assert.equal((await c("/api/auth/me")).status, 200);
});
await step("Origem externa é bloqueada", async () => {
  const res = await fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://malicioso.example" }, body: "{}" });
  assert.equal(res.status, 403);
});
await step("Configura cashback de 10% e endereço", async () => {
  const r = await owner("/api/painel/settings", { method: "PATCH", body: { cashback_percent: "10", cashback_min_order: "20", address: "Av. Brasil, 100, Maringá", latitude: -23.4205, longitude: -51.9331 } });
  assert.equal(r.status, 200, JSON.stringify(r.data));
});
await step("Limite de 5 entregadores e vaga adicional", async () => {
  for (let i = 1; i <= 5; i++) {
    const r = await owner("/api/painel/couriers", { body: { name: `Entregador ${i}`, phone: "44988887777" } });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    if (i === 1) courierToken = r.data.courier_url.split("/entregador/")[1];
  }
  const sixth = await owner("/api/painel/couriers", { body: { name: "Entregador 6" } });
  assert.equal(sixth.status, 409);
  assert.equal(sixth.data.code, "courier_limit");
  assert.equal((await owner("/api/painel/settings", { method: "PATCH", body: { extra_couriers: 1 } })).status, 200);
  assert.equal((await owner("/api/painel/couriers", { body: { name: "Entregador 6" } })).status, 201);
  const p = await owner("/api/painel");
  assert.equal(p.data.plan.courierLimit, 6);
  assert.equal(p.data.plan.monthly, 349);
  couriers = p.data.couriers;
  const reduce = await owner("/api/painel/settings", { method: "PATCH", body: { extra_couriers: 0 } });
  assert.equal(reduce.status, 409, "não pode reduzir vagas com 6 ativos");
});
await step("Outro estabelecimento não vê nem mexe nos dados", async () => {
  assert.equal((await other("/api/auth/signup", { body: { name: "Bia", restaurant: "Pizza Outra", email: `outra+${stamp}@pitou.test`, password: "senha-forte-456" } })).status, 201);
  const p = await other("/api/painel");
  assert.equal(p.data.couriers.length, 0);
  const r = await other(`/api/painel/couriers/${couriers[0].id}`, { method: "PATCH", body: { action: "deactivate" } });
  assert.equal(r.status, 404);
});
await step("Cria pedido com cliente e valor", async () => {
  const courier = couriers.find(c => c.name === "Entregador 1");
  const r = await owner("/api/painel/orders", { body: { customer_name: "Carlos Cliente", customer_phone: "(44) 98765-4321", destination: "Rua das Flores, 50, Maringá", total_amount: "80,00", courier_id: courier.id, notes: "Troco para 100" } });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  order = r.data.order;
  orderId = order.id; trackingToken = order.tracking_token;
  assert.equal(order.number, 1);
  assert.equal((await other(`/api/painel/orders/${orderId}`, { method: "PATCH", body: { action: "status", status: "cancelled" } })).status, 404);
});
await step("Entregador vê o pedido, sai e envia GPS", async () => {
  const g = await anon(`/api/courier/${courierToken}`);
  assert.equal(g.status, 200, JSON.stringify(g.data));
  assert.equal(g.data.orders.length, 1);
  assert.equal(g.data.orders[0].total_amount, 80);
  assert.equal((await anon(`/api/courier/${courierToken}`, { body: { action: "location", order_id: orderId, latitude: -23.42, longitude: -51.93, accuracy_m: 10 } })).status, 409, "GPS só depois de sair");
  assert.equal((await anon(`/api/courier/${courierToken}`, { body: { action: "status", order_id: orderId, status: "on_route" } })).status, 200);
  assert.equal((await anon(`/api/courier/${courierToken}`, { body: { action: "location", order_id: orderId, latitude: -23.4215, longitude: -51.9301, accuracy_m: 12 } })).status, 200);
});
await step("Cliente acompanha com GPS e avisa que está pronto", async () => {
  const t = await anon(`/api/tracking/${trackingToken}`);
  assert.equal(t.status, 200);
  assert.equal(t.data.order.status, "on_route");
  assert.equal(t.data.order.latitude, -23.4215);
  assert.equal(t.data.order.establishment_name, "Burguer do Teste");
  assert.equal(t.data.order.cashback_percent, 10);
  assert.equal(Object.hasOwn(t.data.order, "id"), false);
  assert.equal((await anon(`/api/tracking/${trackingToken}`, { body: { action: "ready" } })).status, 200);
  const p = await owner("/api/painel");
  const o = p.data.orders.find(x => x.id === orderId);
  assert.equal(o.customer_ready, true);
  assert.equal(o.latitude, -23.4215);
});
let deliveryCode = "";
await step("Código de entrega só aparece na chegada e só para o cliente", async () => {
  const before = await anon(`/api/tracking/${trackingToken}`);
  assert.equal(before.data.order.delivery_code, null, "sem destino conhecido, o código espera a chegada");
  const c = await anon(`/api/courier/${courierToken}`);
  assert.equal(Object.hasOwn(c.data.orders[0], "delivery_code"), false, "o entregador nunca recebe o código");
  assert.equal(Object.hasOwn(c.data.orders[0], "tracking_token"), false);
  assert.equal(c.data.orders[0].code_attempts_left, 5);
  // Cliente confirma a localização a uns 100 m do entregador: o código é liberado pela proximidade.
  assert.equal((await anon(`/api/tracking/${trackingToken}`, { body: { action: "destination", latitude: -23.4224, longitude: -51.9301 } })).status, 200);
  const near = await anon(`/api/tracking/${trackingToken}`);
  assert.ok(near.data.order.distance_m > 50 && near.data.order.distance_m < 150, "distância " + near.data.order.distance_m);
  assert.match(near.data.order.delivery_code, /^\d{4}$/);
  assert.equal((await anon(`/api/courier/${courierToken}`, { body: { action: "status", order_id: orderId, status: "arrived" } })).status, 200);
  const t = await anon(`/api/tracking/${trackingToken}`);
  assert.equal(t.data.order.delivery_code, near.data.order.delivery_code, "o código não muda");
  assert.equal(t.data.order.code_verified, false);
  deliveryCode = t.data.order.delivery_code;
});
await step("Entregador precisa do código certo para concluir", async () => {
  const noCode = await anon(`/api/courier/${courierToken}`, { body: { action: "status", order_id: orderId, status: "delivered" } });
  assert.equal(noCode.status, 422, JSON.stringify(noCode.data));
  const wrong = String((Number(deliveryCode) + 1) % 10000).padStart(4, "0");
  const bad = await anon(`/api/courier/${courierToken}`, { body: { action: "status", order_id: orderId, status: "delivered", code: wrong } });
  assert.equal(bad.status, 422);
  assert.match(bad.data.error, /3 tentativas/);
  const c = await anon(`/api/courier/${courierToken}`);
  assert.equal(c.data.orders[0].code_attempts_left, 3);
});
await step("Entrega concluída credita 10% de cashback", async () => {
  const done = await anon(`/api/courier/${courierToken}`, { body: { action: "status", order_id: orderId, status: "delivered", code: deliveryCode } });
  assert.equal(done.status, 200, JSON.stringify(done.data));
  assert.equal(done.data.verified, true);
  const p = await owner("/api/painel");
  assert.equal(p.data.orders.find(x => x.id === orderId).code_verified, true, "painel mostra entrega verificada");
  const v = await anon(`/api/tracking/${trackingToken}`);
  assert.equal(v.data.order.code_verified, true);
  assert.equal(v.data.updates.some(u => u.status === "code_failed"), false, "tentativas erradas não aparecem para o cliente");
  const t = await anon(`/api/tracking/${trackingToken}`);
  assert.equal(t.data.order.status, "delivered");
  assert.equal(t.data.order.cashback_earned, 8);
  assert.equal(t.data.order.cashback_balance, 8);
  assert.equal(t.data.order.latitude, null, "GPS não aparece depois da entrega");
});
await step("Segundo pedido usa o cashback e o cancelamento devolve", async () => {
  const look = await owner("/api/painel/customers?phone=44987654321");
  assert.equal(look.data.customer.cashback_balance, 8);
  const tooMuch = await owner("/api/painel/orders", { body: { customer_name: "Carlos Cliente", customer_phone: "44987654321", destination: "Rua das Flores, 50", total_amount: "30", cashback_used: 9 } });
  assert.equal(tooMuch.status, 409);
  const r = await owner("/api/painel/orders", { body: { customer_name: "Carlos Cliente", customer_phone: "44987654321", destination: "Rua das Flores, 50", total_amount: "30", cashback_used: 8 } });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.equal(r.data.order.number, 2);
  assert.equal((await owner("/api/painel/customers?phone=44987654321")).data.customer.cashback_balance, 0);
  const c = await owner(`/api/painel/orders/${r.data.order.id}`, { method: "PATCH", body: { action: "status", status: "cancelled" } });
  assert.equal(c.status, 200);
  assert.equal((await owner("/api/painel/customers?phone=44987654321")).data.customer.cashback_balance, 8);
});
await step("Pedido abaixo do mínimo não gera cashback", async () => {
  const r = await owner("/api/painel/orders", { body: { customer_name: "Carlos Cliente", customer_phone: "44987654321", destination: "Rua das Flores, 50", total_amount: "15", courier_id: couriers[0].id } });
  const id = r.data.order.id;
  await owner(`/api/painel/orders/${id}`, { method: "PATCH", body: { action: "assign", courier_id: couriers.find(c => c.name === "Entregador 1").id } });
  assert.equal((await owner(`/api/painel/orders/${id}`, { method: "PATCH", body: { action: "status", status: "on_route" } })).status, 200);
  assert.equal((await owner(`/api/painel/orders/${id}`, { method: "PATCH", body: { action: "status", status: "delivered" } })).status, 200);
  assert.equal((await owner("/api/painel/customers?phone=44987654321")).data.customer.cashback_balance, 8);
});
await step("Histórico com totais e filtros", async () => {
  const h = await owner("/api/painel/history");
  assert.equal(h.status, 200);
  assert.equal(h.data.totals.delivered, 2);
  assert.equal(h.data.totals.cancelled, 1);
  assert.equal(h.data.totals.revenue, 95);
  assert.equal(h.data.totals.cashback, 8);
  assert.equal((await owner("/api/painel/history?status=cancelled")).data.orders.length, 1);
  assert.equal((await owner("/api/painel/history?q=98765")).data.orders.length, 3);
  assert.equal((await owner("/api/painel/history?q=2")).data.orders.length >= 1, true);
  const c = await owner("/api/painel/customers");
  assert.equal(c.data.totals.earned, 8);
});
await step("Código errado 5 vezes bloqueia o entregador e o estabelecimento conclui", async () => {
  const r = await owner("/api/painel/orders", { body: { customer_name: "Dora Bloqueio", destination: "Rua do Teste, 77", courier_id: couriers.find(c => c.name === "Entregador 1").id } });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  const id = r.data.id || r.data.order?.id;
  assert.equal((await anon(`/api/courier/${courierToken}`, { body: { action: "status", order_id: id, status: "on_route" } })).status, 200);
  for (let i = 0; i < 5; i++) assert.equal((await anon(`/api/courier/${courierToken}`, { body: { action: "status", order_id: id, status: "delivered", code: "abcd" } })).status, 422);
  assert.equal((await anon(`/api/courier/${courierToken}`, { body: { action: "status", order_id: id, status: "delivered", code: "0000" } })).status, 429);
  assert.equal((await owner(`/api/painel/orders/${id}`, { method: "PATCH", body: { action: "status", status: "delivered" } })).status, 200);
  const p = await owner("/api/painel");
  assert.equal(p.data.orders.find(x => x.id === id).code_verified, false, "concluída pelo estabelecimento, sem código");
});
await step("Link do entregador revogado deixa de funcionar", async () => {
  const id = couriers.find(c => c.name === "Entregador 1").id;
  assert.equal((await owner(`/api/painel/couriers/${id}`, { method: "PATCH", body: { action: "revoke_link" } })).status, 200);
  assert.equal((await anon(`/api/courier/${courierToken}`)).status, 401);
  const n = await owner(`/api/painel/couriers/${id}`, { method: "PATCH", body: { action: "new_link" } });
  assert.equal((await anon(`/api/courier/${n.data.courier_url.split("/entregador/")[1]}`)).status, 200);
});
await step("Cardápio só fica público com o adicional ativo", async () => {
  const p = await owner("/api/painel/menu", { body: { name: "X-Burguer", price: "29,90", category: "Lanches", description: "Pão, carne e queijo", photo_url: "https://images.example/x.jpg" } });
  assert.equal(p.status, 201, JSON.stringify(p.data));
  assert.equal((await owner("/api/painel/menu", { body: { name: "Ruim", price: "abc" } })).status, 400);
  assert.equal((await owner("/api/painel/menu", { body: { name: "Foto http", price: "1", photo_url: "http://inseguro.example/a.jpg" } })).status, 400);
  const before = await fetch(base + "/m/" + slug);
  assert.equal(before.status, 404);
  await owner("/api/painel/settings", { method: "PATCH", body: { menu_enabled: true } });
  const after = await fetch(base + "/m/" + slug);
  assert.equal(after.status, 200);
  assert.match(await after.text(), /X-Burguer/);
  const pl = await owner("/api/painel");
  assert.equal(pl.data.plan.monthly, 398.9);
});
await step("Sair encerra a sessão", async () => {
  assert.equal((await owner("/api/auth/logout", { body: {} })).status, 200);
  assert.equal((await owner("/api/painel")).status, 401);
});

console.log(`\n${passed} passaram, ${failed} falharam`);
process.exit(failed ? 1 : 0);
