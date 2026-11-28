import { currentAccount } from "../../../../lib/auth";
import { fail, ok } from "../../../../lib/http";

export const runtime = "nodejs";
export async function GET(req: Request) {
  try {
    const account = await currentAccount(req);
    if (!account) return fail("Entre na sua conta", 401);
    return ok(account);
  } catch { return fail("Serviço indisponível", 503); }
}
