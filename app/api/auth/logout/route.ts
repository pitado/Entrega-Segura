import { NextResponse } from "next/server";
import { endSession } from "../../../../lib/auth";
import { fail, privateHeaders } from "../../../../lib/http";
import { originAllowed } from "../../../../lib/security";

export const runtime = "nodejs";
export async function POST(req: Request) {
  if (!originAllowed(req)) return fail("Origem não autorizada", 403);
  const res = NextResponse.json({ ok: true }, { headers: privateHeaders });
  try { await endSession(req, res); } catch { /* o cookie é apagado mesmo assim */ }
  return res;
}
