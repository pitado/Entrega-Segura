import { NextRequest, NextResponse } from "next/server";
import { isAdmin, newAdminSession, SESSION_COOKIE, SESSION_LIFE, originAllowed } from "../../../../lib/security";
export const runtime="nodejs";
export async function GET(request:NextRequest) {
  return NextResponse.json({authenticated:await isAdmin(request),configured:Boolean(process.env.MVP_ADMIN_PASSWORD&&process.env.DATABASE_URL)},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request:NextRequest) {
  if(!originAllowed(request)) return NextResponse.json({error:"Origem não autorizada"},{status:403});
  const body=await request.json().catch(()=>({}));
  const session=await newAdminSession(String(body.password||""));
  if(!session) return NextResponse.json({error:"Senha inválida ou acesso não configurado"},{status:401});
  const res=NextResponse.json({authenticated:true});
  res.cookies.set(SESSION_COOKIE,session,{httpOnly:true,secure:true,sameSite:"strict",maxAge:SESSION_LIFE,path:"/"});
  return res;
}
export async function DELETE(request:NextRequest) {
  if(!originAllowed(request)) return NextResponse.json({error:"Origem não autorizada"},{status:403});
  const res=NextResponse.json({authenticated:false});
  res.cookies.set(SESSION_COOKIE,"",{httpOnly:true,secure:true,sameSite:"strict",maxAge:0,path:"/"});
  return res;
}
