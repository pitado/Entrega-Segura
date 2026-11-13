import {NextResponse} from "next/server";
export const runtime="nodejs";

// Chaves de navegador ficam públicas por definição: restrinja a chave no Google Cloud
// aos domínios autorizados e às APIs Maps JavaScript, Routes e Geocoding.
// Nunca exponha tokens privados (Apple MapKit ou chaves de servidor) nesta rota.
export async function GET(){
 return NextResponse.json({googleKey:process.env.GOOGLE_MAPS_BROWSER_KEY||null},{
   headers:{"Cache-Control":"no-store","Referrer-Policy":"no-referrer","X-Robots-Tag":"noindex"}
 });
}
