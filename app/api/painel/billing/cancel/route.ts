import { db } from "../../../../../lib/db";
import { fail, ok } from "../../../../../lib/http";
import { withAccount } from "../../../../../lib/panel";
import { MercadoPagoError, syncPreapproval, updatePreapproval } from "../../../../../lib/billing";

export const runtime = "nodejs";

// Cancela a assinatura (sem fidelidade). O acesso continua até o fim do mês já pago.
export async function POST(req: Request) {
  return withAccount(req, async ({ establishment, user }) => {
    if (user.role !== "owner") return fail("Só o dono da conta pode cancelar a assinatura.", 403);
    const rows = await db().query("SELECT mp_preapproval_id,subscription_status FROM establishments WHERE id=$1", [establishment.id]);
    const id = rows[0]?.mp_preapproval_id;
    if (!id || rows[0].subscription_status === "cancelled") return fail("Não há assinatura ativa para cancelar.", 409);
    try {
      const pre = await updatePreapproval(String(id), { status: "cancelled" });
      await syncPreapproval({ ...pre, external_reference: pre.external_reference || establishment.id }, "cancel");
      return ok({ status: pre.status });
    } catch (err) {
      if (err instanceof MercadoPagoError) return fail("O Mercado Pago não confirmou o cancelamento. Tente novamente.", 502);
      throw err;
    }
  }, { allowUnpaid: true });
}
