import { db } from "../../../../lib/db";
import { ok } from "../../../../lib/http";
import { withAccount } from "../../../../lib/panel";
import { mercadoPagoConfigured, mercadoPagoMode, monthlyAmount, trialDays } from "../../../../lib/billing";
import { pricing } from "../../../pricing";

export const runtime = "nodejs";

// Situação da assinatura. Funciona mesmo sem pagamento, para mostrar a tela de assinar.
export async function GET(req: Request) {
  return withAccount(req, async ({ establishment, user, access }) => {
    const rows = await db().query(
      `SELECT name,extra_couriers,menu_enabled,subscription_status,subscription_amount::float8 AS subscription_amount,
        subscription_payer_email,paid_until,subscription_updated_at,(mp_preapproval_id IS NOT NULL) AS has_subscription
       FROM establishments WHERE id=$1`, [establishment.id]);
    const e = rows[0];
    return ok({
      access,
      user: { name: user.name, email: user.email },
      establishment: { name: e.name },
      subscription: {
        status: e.subscription_status, amount: e.subscription_amount, payerEmail: e.subscription_payer_email,
        paidUntil: e.paid_until, updatedAt: e.subscription_updated_at, exists: Boolean(e.has_subscription),
      },
      plan: {
        extraCouriers: Number(e.extra_couriers), menuEnabled: Boolean(e.menu_enabled),
        monthly: monthlyAmount(Number(e.extra_couriers), Boolean(e.menu_enabled)),
        basePrice: pricing.base, includedCouriers: pricing.includedCouriers, extraCourierPrice: pricing.extraCourier, menuPrice: pricing.menu,
      },
      trialDays: trialDays(),
      paymentsConfigured: mercadoPagoConfigured(),
      paymentsMode: mercadoPagoMode(),
    });
  }, { allowUnpaid: true });
}
