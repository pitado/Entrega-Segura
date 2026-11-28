// Assinatura mensal do Pitou pelo Mercado Pago (API de assinaturas "preapproval", sem plano associado:
// cada estabelecimento tem o próprio valor, que muda com entregadores adicionais e o Menu Digital).
//
// Segredos (configure no Worker, nunca no código):
//   MERCADOPAGO_ACCESS_TOKEN    token de acesso (TEST-... no sandbox, APP_USR-... em produção)
//   MERCADOPAGO_WEBHOOK_SECRET  assinatura secreta dos webhooks (painel do Mercado Pago > Webhooks)
// Variáveis opcionais:
//   PITOU_ADMIN_EMAILS  e-mails com acesso liberado sem pagar, separados por vírgula
//   PITOU_TRIAL_DAYS    dias de teste grátis para contas novas (padrão 7; 0 desliga)
//   PITOU_PUBLIC_URL    endereço público do site (padrão: o da própria requisição)
import { db } from "./db";
import { safeEqual, toHex } from "./security";
import { estimateMonthly, pricing } from "../app/pricing";

// MERCADOPAGO_API_URL só existe para testes locais com um servidor falso; em produção fica vazio.
const MP_API = process.env.MERCADOPAGO_API_URL || "https://api.mercadopago.com";
const DEFAULT_TRIAL_DAYS = 7;
const GRACE_DAYS = 5;

export type BillingRow = {
  created_at: string | Date;
  trial_ends_at: string | Date | null;
  billing_exempt: boolean;
  subscription_status: string | null;
  paid_until: string | Date | null;
};
export type AccessReason = "admin" | "exempt" | "paid" | "trial" | "none";
export type Access = { active: boolean; reason: AccessReason; trialEndsAt: string | null; paidUntil: string | null };

export const billingColumns = "e.created_at,e.trial_ends_at,e.billing_exempt,e.subscription_status,e.paid_until";

export function trialDays() {
  const raw = process.env.PITOU_TRIAL_DAYS;
  const n = raw === undefined || raw === "" ? DEFAULT_TRIAL_DAYS : Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 90 ? n : DEFAULT_TRIAL_DAYS;
}
export function isAdminEmail(email: string) {
  const list = (process.env.PITOU_ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}
const iso = (v: string | Date | null | undefined) => v ? new Date(v).toISOString() : null;

/** Decide se o estabelecimento pode usar o painel agora. */
export function accessFor(row: BillingRow, email: string, now = Date.now()): Access {
  const created = new Date(row.created_at).getTime();
  const trialEnd = row.trial_ends_at ? new Date(row.trial_ends_at).getTime() : created + trialDays() * 86_400_000;
  const paidUntil = row.paid_until ? new Date(row.paid_until).getTime() : 0;
  const base = { trialEndsAt: Number.isFinite(trialEnd) ? new Date(trialEnd).toISOString() : null, paidUntil: iso(row.paid_until) };
  if (isAdminEmail(email)) return { active: true, reason: "admin", ...base };
  if (row.billing_exempt) return { active: true, reason: "exempt", ...base };
  // Assinatura ativa vale até a próxima cobrança + carência (o Mercado Pago tenta cobrar de novo se o cartão falhar).
  // Cancelada ou pausada vale até o fim do mês já pago.
  const authorized = row.subscription_status === "authorized" && (!paidUntil || paidUntil + GRACE_DAYS * 86_400_000 > now);
  if (authorized || paidUntil > now) return { active: true, reason: "paid", ...base };
  if (trialEnd > now) return { active: true, reason: "trial", ...base };
  return { active: false, reason: "none", ...base };
}

export function monthlyAmount(extraCouriers: number, menuEnabled: boolean) {
  return estimateMonthly(pricing.includedCouriers + extraCouriers, menuEnabled);
}

// ---------- API do Mercado Pago ----------

export class MercadoPagoError extends Error {
  constructor(message: string, public status: number, public detail?: unknown) { super(message); }
}
export const mercadoPagoConfigured = () => Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
/** "test" com credenciais de teste (TEST-...): só usuários de teste do Mercado Pago conseguem pagar. */
export const mercadoPagoMode = (): "test" | "live" | null => {
  const t = process.env.MERCADOPAGO_ACCESS_TOKEN || "";
  return !t ? null : t.startsWith("TEST-") ? "test" : "live";
};

/** Traduz os erros do Mercado Pago para uma mensagem que o estabelecimento entende. */
export function friendlyMercadoPagoError(err: MercadoPagoError): string {
  const m = `${err.message} ${JSON.stringify(err.detail ?? "")}`.toLowerCase();
  if (err.status === 503) return err.message;
  if (err.status === 401 || err.status === 403 && m.includes("token")) return "A configuração de pagamento do Pitou está inválida. Fale com a equipe Pitou.";
  if (m.includes("real or test users")) return mercadoPagoMode() === "test"
    ? "O pagamento está em modo de teste: só um comprador de teste do Mercado Pago consegue assinar agora. Use o e-mail de um usuário de teste."
    : "Esse e-mail é de um usuário de teste do Mercado Pago. Use o e-mail da sua conta real.";
  if (m.includes("same user") || m.includes("collector") && m.includes("payer") && m.includes("same")) return "Esse e-mail é da conta que recebe os pagamentos do Pitou. Use o e-mail de outra conta Mercado Pago.";
  if (m.includes("countr")) return "A conta Mercado Pago precisa ser do Brasil.";
  if (m.includes("payer_email") || m.includes("email")) return "O Mercado Pago não aceitou esse e-mail. Confira se é o e-mail da sua conta Mercado Pago.";
  if (err.status >= 500) return "O Mercado Pago está instável agora. Tente de novo em alguns minutos.";
  return "O Mercado Pago recusou a assinatura. Confira o e-mail e tente novamente.";
}

async function mp<T = Record<string, unknown>>(path: string, init: { method?: string; body?: unknown; idempotencyKey?: string } = {}): Promise<T> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new MercadoPagoError("Pagamento ainda não configurado. Fale com a equipe Pitou.", 503);
  const res = await fetch(MP_API + path, {
    method: init.method || (init.body ? "POST" : "GET"),
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.idempotencyKey ? { "X-Idempotency-Key": init.idempotencyKey } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({})) as Record<string, unknown>;
  if (!res.ok) {
    console.error("mercadopago", path, res.status, JSON.stringify(data).slice(0, 500));
    throw new MercadoPagoError(String(data.message || "O Mercado Pago recusou a operação"), res.status, data);
  }
  return data as T;
}

export type Preapproval = {
  id: string; status: string; init_point?: string; external_reference?: string; payer_email?: string;
  next_payment_date?: string; auto_recurring?: { transaction_amount?: number };
};

export function createPreapproval(input: { establishmentId: string; establishmentName: string; payerEmail: string; amount: number; backUrl: string }) {
  return mp<Preapproval>("/preapproval", {
    idempotencyKey: `${input.establishmentId}-${input.amount}-${input.payerEmail}-${Math.floor(Date.now() / 600_000)}`,
    body: {
      reason: `Pitou · ${input.establishmentName}`.slice(0, 120),
      external_reference: input.establishmentId,
      payer_email: input.payerEmail,
      back_url: input.backUrl,
      status: "pending",
      auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: input.amount, currency_id: "BRL" },
    },
  });
}
export const getPreapproval = (id: string) => mp<Preapproval>(`/preapproval/${encodeURIComponent(id)}`);
export const updatePreapproval = (id: string, body: Record<string, unknown>) =>
  mp<Preapproval>(`/preapproval/${encodeURIComponent(id)}`, { method: "PUT", body });
export const getAuthorizedPayment = (id: string) =>
  mp<{ id: number; preapproval_id?: string; status?: string; payment?: { status?: string } }>(`/authorized_payments/${encodeURIComponent(id)}`);

/**
 * Grava no banco o estado atual da assinatura, sempre lido da API do Mercado Pago (nunca do corpo do webhook).
 * Mantém paid_until como o maior período já coberto, para quem cancelar usar até o fim do mês pago.
 */
export async function syncPreapproval(pre: Preapproval, topic: string, payload: unknown = null) {
  const establishmentId = pre.external_reference || "";
  const sql = db();
  const covered = pre.status === "authorized" && pre.next_payment_date ? new Date(pre.next_payment_date) : null;
  const rows = await sql.query(
    `UPDATE establishments SET mp_preapproval_id=$2,subscription_status=$3,
        subscription_amount=coalesce($4,subscription_amount),subscription_payer_email=coalesce($5,subscription_payer_email),
        paid_until=CASE WHEN $6::timestamptz IS NULL THEN paid_until ELSE greatest(coalesce(paid_until,$6::timestamptz),$6::timestamptz) END,
        subscription_updated_at=now()
      WHERE id::text=$1 AND (mp_preapproval_id IS NULL OR mp_preapproval_id=$2 OR $3='authorized')
      RETURNING id`,
    [establishmentId, pre.id, pre.status, pre.auto_recurring?.transaction_amount ?? null, pre.payer_email || null, covered ? covered.toISOString() : null]);
  await sql.query("INSERT INTO billing_events(establishment_id,topic,resource_id,status,payload) VALUES($1,$2,$3,$4,$5)",
    [rows[0]?.id ?? null, topic, pre.id, pre.status, payload === null ? null : JSON.stringify(payload)]);
  return rows.length > 0;
}

// ---------- Webhook ----------

/**
 * Confere o cabeçalho x-signature do Mercado Pago:
 *   manifest = "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"  e  v1 = HMAC-SHA256(manifest, segredo)
 */
export async function validWebhookSignature(req: Request, dataId: string, secret: string) {
  const header = req.headers.get("x-signature") || "";
  const parts = Object.fromEntries(header.split(",").map(p => p.trim().split("=", 2) as [string, string]));
  const ts = parts.ts, v1 = parts.v1;
  if (!ts || !v1) return false;
  const requestId = req.headers.get("x-request-id");
  let manifest = "";
  if (dataId) manifest += `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest)));
  return safeEqual(sig, v1.toLowerCase());
}

export function publicBase(req: Request) {
  const configured = process.env.PITOU_PUBLIC_URL;
  if (configured) return configured.replace(/\/$/, "");
  return new URL(req.url).origin;
}
