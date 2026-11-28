import { db } from "../../../../../lib/db";
import { fail, ok } from "../../../../../lib/http";
import { withAccount } from "../../../../../lib/panel";
import { getPreapproval, MercadoPagoError, syncPreapproval } from "../../../../../lib/billing";

export const runtime = "nodejs";

// Consulta a assinatura direto no Mercado Pago (útil na volta do pagamento, antes do webhook chegar).
export async function POST(req: Request) {
  return withAccount(req, async ({ establishment }) => {
    const rows = await db().query("SELECT mp_preapproval_id FROM establishments WHERE id=$1", [establishment.id]);
    const id = rows[0]?.mp_preapproval_id;
    if (!id) return ok({ status: null });
    try {
      const pre = await getPreapproval(String(id));
      if (pre.external_reference !== establishment.id) return fail("Assinatura não pertence a esta conta", 409);
      await syncPreapproval(pre, "sync");
      return ok({ status: pre.status });
    } catch (err) {
      if (err instanceof MercadoPagoError) return fail("Não foi possível consultar o Mercado Pago agora.", 502);
      throw err;
    }
  }, { allowUnpaid: true });
}
