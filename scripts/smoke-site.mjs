import assert from "node:assert/strict";

const base=String(process.env.TEST_BASE_URL||"https://entrega-segura2.miguellpitaa.workers.dev").replace(/\/$/,"");
const timeoutMs=15000;
let passed=0, failed=0;
const issues=[];

async function request(path,options={}){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const res=await fetch(base+path,{...options,signal:controller.signal,headers:{"Accept":"application/json",...options.headers}});
  let body;
  const text=await res.text();
  try{body=JSON.parse(text);}catch{body=text;}
  return {status:res.status,body,headers:res.headers};
 }finally{clearTimeout(timer);}
}
function post(path,data,headers={}){
 return request(path,{method:"POST",headers:{"Content-Type":"application/json",...headers},body:JSON.stringify(data)});
}
async function check(name,fn){
 try{await fn();passed++;console.log("PASS",name);}
 catch(err){failed++;issues.push({name,error:String(err?.message||err)});console.error("FAIL",name,String(err?.message||err));}
}
async function readyForSmoke(){
 for(let attempt=0;attempt<36;attempt++){
  try{
   const cfg=await request("/api/maps/config");
   if(cfg.status===200&&typeof cfg.body?.mapboxReady==="boolean")return;
  }catch{}
  await new Promise(r=>setTimeout(r,5000));
 }
 throw new Error("O Worker atualizado não ficou disponível dentro do prazo.");
}
await readyForSmoke();
let sessionKey="",courierToken="",consumerToken="",orderId="";
await check("Página inicial e rotas web",async()=>{
 for(const path of ["/","/demo","/laboratorio","/acompanhar","/entregador"]){
  const res=await request(path);
  assert.equal(res.status,200,path+" "+res.status);
  assert.match(String(res.body),/Entrega Segura/i,path);
 }
});
await check("Neon e endpoint de saúde",async()=>{
 const res=await request("/api/health");
 assert.equal(res.status,200);
 assert.equal(res.body.database,"connected");
});
await check("Configuração do mapa não revela a chave",async()=>{
 const res=await request("/api/maps/config");
 assert.equal(res.status,200);
 assert.equal(typeof res.body.mapboxReady,"boolean");
 assert.equal(JSON.stringify(res.body).includes("pk."),false);
 assert.equal(JSON.stringify(res.body).includes("sk."),false);
 assert.equal(Object.hasOwn(res.body,"access_token"),false);
});
await check("Rotas pagas não podem ser chamadas sem token válido",async()=>{
 const res=await post("/api/maps/route",{origin:[-51.9,-23.4],destination:[-51.8,-23.3]});
 assert.ok([403,503].includes(res.status),"Resposta inesperada: "+res.status);
});
await check("Área administrativa protegida",async()=>{
 const auth=await request("/api/admin/session");
 assert.equal(auth.status,200);
 assert.equal(auth.body.authenticated,false);
 const res=await request("/api/admin");
 assert.equal(res.status,401);
});
await check("Rejeição de links inválidos",async()=>{
 const res=await request("/api/tracking/token-invalido");
 assert.ok([400,404].includes(res.status));
 const courier=await request("/api/courier/token-invalido");
 assert.ok([400,401,404].includes(courier.status));
 const demo=await request("/api/demo");
 assert.equal(demo.status,401);
});
await check("Proteção de origem no ambiente de teste",async()=>{
 const res=await post("/api/demo",{action:"start"},{Origin:"https://exemplo-externo.invalid"});
 assert.equal(res.status,403);
});
await check("Iniciar ambiente isolado no Neon",async()=>{
 const res=await post("/api/demo",{action:"start"});
 assert.equal(res.status,201,JSON.stringify(res.body));
 assert.match(res.body.access_token,/^[a-f\d-]{36}$/i);
 sessionKey=res.body.access_token;
});
if(sessionKey){
 const headers={Authorization:"Bearer "+sessionKey};
 await check("Consultar sessão e pedidos",async()=>{
  const res=await request("/api/demo",{headers});
  assert.equal(res.status,200);
  assert.ok(res.body.couriers.length>=1);
  assert.ok(res.body.orders.length>=1);
 });
 await check("Criar pedido e gerar links",async()=>{
  const res=await post("/api/demo",{action:"order",customer:"Teste automatizado",destination:"Centro, Maringá - PR"},headers);
  assert.equal(res.status,201,JSON.stringify(res.body));
  assert.match(res.body.id,/^[a-f\d-]{36}$/i);
  assert.match(res.body.tracking_token,/^[a-f\d-]{36}$/i);
  assert.match(res.body.courier_access_token,/^[a-f\d-]{36}$/i);
  orderId=res.body.id;consumerToken=res.body.tracking_token;courierToken=res.body.courier_access_token;
 });
 await check("Cadastrar outro motoboy de teste",async()=>{
  const res=await post("/api/demo",{action:"courier",name:"Motoboy automatizado"},headers);
  assert.equal(res.status,201,JSON.stringify(res.body));
  const assign=await post("/api/demo",{action:"assign",order_id:orderId,courier_id:res.body.id},headers);
  assert.equal(assign.status,200,JSON.stringify(assign.body));
 });
 if(courierToken&&consumerToken){
  await check("Link do motoboy e estado inicial",async()=>{
   const res=await request("/api/demo/courier/"+courierToken);
   assert.equal(res.status,200);
   assert.equal(res.body.status,"preparing");
  });
  await check("Bloquear GPS antes de sair",async()=>{
   const res=await post("/api/demo/courier/"+courierToken,{action:"position",source:"simulation",latitude:-23.42690,longitude:-51.93566});
   assert.equal(res.status,409);
  });
  await check("Iniciar viagem e rejeitar coordenadas inválidas",async()=>{
   const res=await post("/api/demo/courier/"+courierToken,{action:"status",status:"on_route"});
   assert.equal(res.status,200,JSON.stringify(res.body));
   const invalid=await post("/api/demo/courier/"+courierToken,{action:"position",source:"simulation",latitude:1000,longitude:500});
   assert.equal(invalid.status,400);
  });
  await check("Enviar posição de teste para o Neon",async()=>{
   const res=await post("/api/demo/courier/"+courierToken,{action:"position",source:"simulation",latitude:-23.42690,longitude:-51.93566,accuracy:8});
   assert.equal(res.status,200,JSON.stringify(res.body));
  });
  await check("Consumidor acompanha posição e motoboy",async()=>{
   const res=await request("/api/demo/tracking/"+consumerToken);
   assert.equal(res.status,200,JSON.stringify(res.body));
   assert.equal(res.body.status,"on_route");
   assert.equal(Number(res.body.latitude),-23.42690);
   assert.equal(res.body.location_source,"simulation");
  });
  await check("Cliente confirma pronto para receber",async()=>{
   const res=await post("/api/demo/tracking/"+consumerToken,{action:"ready"});
   assert.equal(res.status,200);
   const updated=await request("/api/demo/tracking/"+consumerToken);
   assert.equal(updated.body.customer_ready,true);
  });
  await check("Cliente informa destino preciso",async()=>{
   const res=await post("/api/demo/tracking/"+consumerToken,{action:"destination",latitude:-23.4210,longitude:-51.9330});
   assert.equal(res.status,200);
   const updated=await request("/api/demo/tracking/"+consumerToken);
   assert.equal(Number(updated.body.destination_latitude),-23.4210);
  });
  await check("Chegada e conclusão de entrega",async()=>{
   const arrived=await post("/api/demo/courier/"+courierToken,{action:"status",status:"arrived"});
   assert.equal(arrived.status,200);
   const done=await post("/api/demo/courier/"+courierToken,{action:"status",status:"delivered"});
   assert.equal(done.status,200);
   const tracking=await request("/api/demo/tracking/"+consumerToken);
   assert.equal(tracking.body.status,"delivered");
   assert.equal(tracking.body.latitude,null);
  });
  await check("Impedir reabertura de pedido entregue",async()=>{
   const res=await post("/api/demo/courier/"+courierToken,{action:"status",status:"on_route"});
   assert.equal(res.status,409);
  });
 }
}
console.log("\nResumo:",passed,"testes aprovados,",failed,"falhas.");
if(issues.length)console.log(JSON.stringify(issues,null,2));
process.exitCode=failed>0?1:0;
