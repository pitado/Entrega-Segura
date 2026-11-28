import { db } from "../../../../../lib/db";
import { fail, ok, readJson, text } from "../../../../../lib/http";
import { withAccount } from "../../../../../lib/panel";
import { createPreapproval, friendlyMercadoPagoError, MercadoPagoError, monthlyAmount, publicBase } from "../../../../../lib/billing";
import { pricing } from "../../../../pricing";

export const runtime = "nodejs";
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

// Cria a assinatura no Mercado Pago e devolve o link de pagamento (init_point).
// O acesso só é liberado quando o Mercado Pago confirmar (webhook ou /sync), nunca aqui.
export async function POST(req: Request) {
  return withAccount(req, async ({ establishment, user }) => {
    const body = await readJson(req);
    const payerEmail = (text(body.payer_email, 160) || user.email).toLowerCase();
    if (!emailOk(payerEmail)) return fail("Informe o e-mail da sua conta Mercado Pago");
    const sql = db();
    const rows = await sql.query("SELECT name,extra_couriers,menu_enabled,subscription_status FROM establishments WHERE id=$1", [establishment.id]);
    const e = rows[0];
    if (e.subscription_status === "authorized") return fail("Sua assinatura já está ativa.", 409, { code: "already_active" });

    let extra = Number(e.extra_couriers), menu = Boolean(e.menu_enabled);
    if ("extra_couriers" in body) {
      extra = Number(body.extra_couriers);
      if (!Number.isInteger(extra) || extra < 0 || extra > 500) return fail("Quantidade de entregadores adicionais inválida");
      const active = await sql.query("SELECT count(*)::int AS n FROM couriers WHERE establishment_id=$1 AND active AND demo_session_id IS NULL", [establishment.id]);
      if (Number(active[0].n) > pricing.includedCouriers + extra)
        return fail(`Você tem ${active[0].n} entregadores ativos. Escolha pelo menos ${Number(active[0].n) - pricing.includedCouriers} adicionais.`, 409);
    }
    if ("menu_enabled" in body) menu = Boolean(body.menu_enabled);
    const amount = monthlyAmount(extra, menu);

    try {
      const pre = await createPreapproval({
        establishmentId: establishment.id, establishmentName: String(e.name), payerEmail, amount,
        backUrl: publicBase(req) + "/painel?assinatura=retorno",
      });
      if (!pre.init_point) return fail("O Mercado Pago não devolveu o link de pagamento. Tente novamente.", 502);
      await sql.query(
        `UPDATE establishments SET extra_couriers=$2,menu_enabled=$3,mp_preapproval_id=$4,subscription_status=$5,
           subscription_amount=$6,subscription_payer_email=$7,subscription_updated_at=now(),updated_at=now() WHERE id=$1`,
        [establishment.id, extra, menu, pre.id, pre.status || "pending", amount, payerEmail]);
      await sql.query("INSERT INTO billing_events(establishment_id,topic,resource_id,status) VALUES($1,'created',$2,$3)", [establishment.id, pre.id, pre.status || "pending"]);
      return ok({ init_point: pre.init_point, amount }, 201);
    } catch (err) {
      if (err instanceof MercadoPagoError) return fail(friendlyMercadoPagoError(err), err.status === 503 ? 503 : 502);
      throw err;
    }
  }, { allowUnpaid: true });
}
