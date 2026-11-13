import {NextResponse} from "next/server";
export const runtime="nodejs";
export async function GET(){
 return NextResponse.json({mapboxReady:!!process.env.MAPBOX_ACCESS_TOKEN},{
   headers:{"Cache-Control":"no-store","Referrer-Policy":"no-referrer","X-Robots-Tag":"noindex"}
 });
}
