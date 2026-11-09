import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token))
    return NextResponse.json({ error: "Link inválido" }, { status: 400 });
  try {
    const rows = await db()`SELECT status, customer_ready, created_at, delivered_at FROM orders WHERE tracking_token = ${token}::uuid AND created_at > now() - interval '7 days' LIMIT 1`;
    if (!rows.length) return NextResponse.json({ error: "Pedido não encontrado ou link expirado" }, { status: 404 });
    return NextResponse.json(rows[0], { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch { return NextResponse.json({ error: "Serviço indisponível" }, { status: 503 }); }
}
