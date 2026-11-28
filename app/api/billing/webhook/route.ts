import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getAuthorizedPayment, getPreapproval, MercadoPagoError, syncPreapproval, validWebhookSignature } from "../../../../lib/billing";

export const runtime = "nodejs";

const reply = (status: number, body: Record<string, unknown> = { ok: status < 300 }) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Webhook do Mercado Pago. Cadastre no painel do Mercado Pago:
//   URL: https://pitou.com.br/api/billing/webhook   Eventos: "Planos e assinaturas"
// Segurança: confere x-signature com MERCADOPAGO_WEBHOOK_SECRET e, em todo caso, só confia no que a API do
// Mercado Pago responde para o id recebido. Um aviso falso não libera acesso.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const body = await req.json().catch(() => ({})) as { type?: string; topic?: string; action?: string; data?: { id?: string | number }; id?: string | number };
  const topic = String(url.searchParams.get("type") || url.searchParams.get("topic") || body.type || body.topic || "");
  const dataId = String(url.searchParams.get("data.id") || url.searchParams.get("id") || body.data?.id || "").slice(0, 80);

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (secret && !(await validWebhookSignature(req, dataId, secret))) return reply(401, { error: "assinatura inválida" });
  if (!dataId || !/^[\w-]+$/.test(dataId)) return reply(200, { ignored: true });

  try {
    if (topic === "subscription_preapproval" || topic === "preapproval") {
      const pre = await getPreapproval(dataId);
      await syncPreapproval(pre, topic, body);
      return reply(200);
    }
    if (topic === "subscription_authorized_payment" || topic === "authorized_payment") {
      const payment = await getAuthorizedPayment(dataId);
      if (payment.preapproval_id) {
        const pre = await getPreapproval(payment.preapproval_id);
        await syncPreapproval(pre, `payment:${payment.payment?.status || payment.status || "?"}`, body);
      }
      return reply(200);
    }
    await db().query("INSERT INTO billing_events(topic,resource_id,payload) VALUES($1,$2,$3)", [topic || "unknown", dataId, JSON.stringify(body)]).catch(() => {});
    return reply(200, { ignored: true });
  } catch (err) {
    console.error("webhook mercadopago", err);
    // 404 do Mercado Pago (id inexistente, ex.: teste do painel) não precisa ser reenviado.
    if (err instanceof MercadoPagoError && err.status === 404) return reply(200, { ignored: true });
    return reply(500, { error: "falha temporária" });
  }
}
