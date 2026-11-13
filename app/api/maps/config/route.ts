import {NextResponse} from "next/server";
export const runtime="nodejs";
export async function GET() {
  // Both browser credentials must be restricted to the application domains in their providers.
  return NextResponse.json({
    googleKey:process.env.GOOGLE_MAPS_BROWSER_KEY||null,
    appleToken:process.env.APPLE_MAPKIT_JS_TOKEN||null
  },{headers:{"Cache-Control":"no-store"}});
}
