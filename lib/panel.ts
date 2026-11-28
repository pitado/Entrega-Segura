import { currentAccount, type Account } from "./auth";
import { fail } from "./http";
import { originAllowed } from "./security";
import { estimateMonthly, pricing } from "../app/pricing";

/**
 * Executa uma rota do painel só para quem está logado e com acesso liberado (assinatura, teste ou cortesia).
 * Mutação exige a mesma origem. Rotas de assinatura passam { allowUnpaid: true } para quem ainda vai pagar.
 */
export async function withAccount(req: Request, handler: (account: Account) => Promise<Response>, options: { allowUnpaid?: boolean } = {}): Promise<Response> {
  if (req.method !== "GET" && !originAllowed(req)) return fail("Origem não autorizada", 403);
  let account: Account | null;
  try { account = await currentAccount(req); } catch { return fail("Serviço indisponível. Verifique o banco.", 503); }
  if (!account) return fail("Sua sessão expirou. Entre novamente.", 401);
  if (!account.access.active && !options.allowUnpaid)
    return fail("Ative a assinatura do Pitou para usar o painel.", 402, { code: "payment_required" });
  try { return await handler(account); }
  catch (err) {
    console.error("painel", err);
    return fail("Não foi possível concluir. Tente novamente.", 503);
  }
}

export function planSummary(extraCouriers: number, menuEnabled: boolean, activeCouriers: number) {
  const courierLimit = pricing.includedCouriers + extraCouriers;
  return {
    includedCouriers: pricing.includedCouriers,
    extraCouriers,
    courierLimit,
    activeCouriers,
    extraCourierPrice: pricing.extraCourier,
    menuEnabled,
    menuPrice: pricing.menu,
    basePrice: pricing.base,
    monthly: estimateMonthly(courierLimit, menuEnabled),
  };
}
