"use client";
import {useEffect,useRef,useState} from "react";
import {LocateFixed,Navigation,MapPin} from "lucide-react";

export type MapPoint={lat:number;lng:number};
type Summary={minutes:number|null;km:number|null;provider:"mapbox"|"demo"|"none"};
type Props={
 origin?:MapPoint|null;destination?:MapPoint|null;destinationAddress?:string;
 routePoints?:MapPoint[];orderToken?:string;simulated?:boolean;
 status?:string;updatedAt?:string|null;compact?:boolean;
};
type RouteApi={minutes:number;distanceKm:number;points:number[][];provider:"mapbox"};
declare global{interface Window{maplibregl?:any;__esLibrePromise?:Promise<void>}}
const startPoint={lat:-23.4205,lng:-51.9333};
const ll=(p:MapPoint):[number,number]=>[p.lng,p.lat];
const point=(p?:MapPoint|null):p is MapPoint=>!!p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng);
function script(src:string,id:string):Promise<void>{
 return new Promise((resolve,reject)=>{
   const old=document.getElementById(id) as HTMLScriptElement|null;
   if(old?.dataset.ready==="yes")return resolve();
   const el=old||document.createElement("script");
   if(!old){el.id=id;el.src=src;el.async=true;document.head.append(el);}
   el.addEventListener("load",()=>{el.dataset.ready="yes";resolve();},{once:true});
   el.addEventListener("error",()=>reject(new Error("Mapa não disponível")),{once:true});
 });
}
function badge(kind:"moto"|"dest"){
 const el=document.createElement("div");
 el.className="es-route-marker "+kind;
 el.innerHTML=kind==="moto"?
 '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 16a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M16 16a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M7.5 14h5l4 -4h-10.5m1.5 4l4 -4"/><path d="M13 6h2l1.5 3l2 4"/></svg>':
 '<svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.3" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="white"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg>';
 el.setAttribute("role","img");
 el.setAttribute("aria-label",kind==="moto"?"Motoboy":"Destino do cliente");
 return el;
}
function distanceMeters(a:MapPoint,b:MapPoint){
 const rad=Math.PI/180,dLat=(b.lat-a.lat)*rad,dLng=(b.lng-a.lng)*rad;
 const h=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLng/2)**2;
 return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
function demoDistance(points:MapPoint[]){
 let meters=0;for(let i=1;i<points.length;i++)meters+=distanceMeters(points[i-1],points[i]);
 return meters;
}
export default function LiveTripMap({origin,destination,destinationAddress="",routePoints,
 orderToken,simulated=false,status="preparing",updatedAt,compact=false}:Props){
 const host=useRef<HTMLDivElement>(null),map=useRef<any>(null);
 const markers=useRef<any[]>([]),lastRoute=useRef<{time:number;origin:MapPoint;destination:string}|null>(null);
 const activeCall=useRef<AbortController|null>(null),lastGeometry=useRef<number[][]|null>(null);
 const [ready,setReady]=useState(false),[error,setError]=useState("");
 const [mapboxReady,setMapboxReady]=useState(false),[summary,setSummary]=useState<Summary>({minutes:null,km:null,provider:"none"});
 const [follow,setFollow]=useState(true);
 const src=point(origin)?origin:simulated?routePoints?.[0]||null:null;
 const dest=point(destination)?destination:simulated?routePoints?.[routePoints.length-1]||null:null;
 const active=status==="on_route"||status==="arrived";
 const localDemo=simulated&&!orderToken;
 useEffect(()=>{
   let gone=false;
   fetch("/api/maps/config",{cache:"no-store"}).then(r=>r.json()).then(v=>{
     if(!gone)setMapboxReady(v.mapboxReady===true);
   }).catch(()=>{});
   return()=>{gone=true;};
 },[]);
 useEffect(()=>{
   let disposed=false;
   setReady(false);
   const root=host.current;if(!root)return;
   root.replaceChildren();
   async function init(){
     try{
       if(!document.getElementById("es-libre-css")){
         const link=document.createElement("link");link.id="es-libre-css";link.rel="stylesheet";
         link.href="https://cdn.jsdelivr.net/npm/maplibre-gl@5.6.1/dist/maplibre-gl.css";
         document.head.append(link);
       }
       await(window.__esLibrePromise ||= script("https://cdn.jsdelivr.net/npm/maplibre-gl@5.6.1/dist/maplibre-gl.js","es-libre-route"));
       if(disposed||!host.current||!window.maplibregl)return;
       const L=window.maplibregl;
       const m=new L.Map({container:root,style:"https://tiles.openfreemap.org/styles/positron",
         center:ll(src||dest||startPoint),zoom:14,dragRotate:false,touchPitch:false,attributionControl:true});
       map.current=m;
       m.addControl(new L.NavigationControl({showCompass:false}),"top-right");
       m.on("dragstart",()=>setFollow(false));
       await new Promise<void>(resolve=>m.loaded()?resolve():m.once("load",resolve));
       if(disposed)return;
       const data={type:"Feature",properties:{},geometry:{type:"LineString",coordinates:[]}};
       m.addSource("es-route",{type:"geojson",data});
       m.addLayer({id:"es-route-border",type:"line",source:"es-route",
         layout:{"line-cap":"round","line-join":"round"},
         paint:{"line-color":"#ffffff","line-width":9,"line-opacity":.9}});
       m.addLayer({id:"es-route-line",type:"line",source:"es-route",
         layout:{"line-cap":"round","line-join":"round"},
         paint:{"line-color":"#3e7894","line-width":5,"line-opacity":.97}});
       window.setTimeout(()=>{if(!disposed)m.resize();},150);
       setReady(true);
     }catch{if(!disposed)setError("Não foi possível carregar o mapa.");}
   }
   void init();
   return()=>{
     disposed=true;activeCall.current?.abort();
     markers.current.forEach(marker=>marker?.remove());markers.current=[];
     try{map.current?.remove();}catch{}
     map.current=null;
   };
 },[]);
 function draw(points:number[][]){
   const m=map.current;if(!m)return;
   const coordinates=points.filter(p=>p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1]));
   const src=m.getSource("es-route");
   if(src&&coordinates.length>=2){
     src.setData({type:"Feature",properties:{},geometry:{type:"LineString",coordinates}});
     lastGeometry.current=coordinates;
   }
 }
 useEffect(()=>{
   if(!ready||!map.current||!window.maplibregl)return;
   const L=window.maplibregl,m=map.current;
   const positions=[src,dest];
   positions.forEach((p,i)=>{
     const old=markers.current[i];
     if(!p){if(old){old.remove();markers.current[i]=null;}return;}
     if(old){old.setLngLat(ll(p));return;}
     markers.current[i]=new L.Marker({element:badge(i===0?"moto":"dest"),anchor:"bottom",offset:[0,-5]})
       .setLngLat(ll(p)).addTo(m);
   });
   if(follow){
     if(src&&dest){
       const a=ll(src),b=ll(dest);
       m.fitBounds([a,b],{padding:{top:64,bottom:73,left:50,right:50},maxZoom:15,duration:700});
     }else if(src||dest)m.easeTo({center:ll((src||dest)!),zoom:14,duration:600});
   }
 },[ready,src?.lat,src?.lng,dest?.lat,dest?.lng,follow]);
 useEffect(()=>{
   if(!ready||!src||!dest)return;
   const coords=localDemo&&routePoints?.length?routePoints:[src,dest];
   if(localDemo&&!mapboxReady){
     const i=routePoints?.findIndex(p=>p.lat===src.lat&&p.lng===src.lng)??0;
     const remaining=coords.slice(Math.max(0,i));
     draw(remaining.map(ll));
     const km=Math.round(demoDistance(remaining)/100)/10;
     setSummary({minutes:active?Math.max(1,Math.ceil(remaining.length*3/60)):null,km:active?km:null,provider:"demo"});
     return;
   }
   if(!active||!mapboxReady||(!localDemo&&!orderToken))return;
   const currentTime=Date.now();
   const key=dest.lat.toFixed(5)+","+dest.lng.toFixed(5);
   const recent=lastRoute.current;
   if(recent&&recent.destination===key&&currentTime-recent.time<60000&&
      distanceMeters(recent.origin,src)<85)return;
   lastRoute.current={time:currentTime,origin:{...src},destination:key};
   activeCall.current?.abort();
   const controller=new AbortController();activeCall.current=controller;
   const step=localDemo&&routePoints?.length?routePoints.findIndex(p=>p.lat===src.lat&&p.lng===src.lng):-1;
   const body=localDemo?{demoStep:Math.max(0,step)}:{orderToken};
   async function load(){
     try{
       const r=await fetch("/api/maps/route",{method:"POST",headers:{"Content-Type":"application/json"},
         body:JSON.stringify(body),signal:controller.signal,cache:"no-store"});
       if(!r.ok)throw Error("Rota indisponível");
       const data:RouteApi=await r.json();
       if(controller.signal.aborted)return;
       draw(data.points);
       setSummary({minutes:data.minutes,km:data.distanceKm,provider:"mapbox"});
       setError("");
     }catch(e){
       if(controller.signal.aborted)return;
       if(localDemo&&routePoints?.length){
         const i=routePoints.findIndex(p=>p.lat===src!.lat&&p.lng===src!.lng);
         const remain=routePoints.slice(Math.max(0,i));
         draw(remain.map(ll));
         setSummary({minutes:Math.max(1,Math.ceil(remain.length*3/60)),
           km:Math.round(demoDistance(remain)/100)/10,provider:"demo"});
       }else{
         setSummary({minutes:null,km:null,provider:"none"});
       }
       setError("Rota pelas ruas indisponível no momento.");
     }
   }
   void load();
   return()=>{controller.abort();};
 },[ready,mapboxReady,src?.lat,src?.lng,dest?.lat,dest?.lng,active,localDemo,orderToken]);
 function recenter(){
   setFollow(true);
   if(!map.current)return;
   const coords=[src,dest].filter((p):p is MapPoint=>point(p)).map(ll);
   if(coords.length===2)map.current.fitBounds([coords[0],coords[1]],{padding:65,maxZoom:15,duration:650});
   else if(coords.length===1)map.current.easeTo({center:coords[0],zoom:14,duration:550});
 }
 const address=dest?dest.lat+","+dest.lng:destinationAddress;
 const ext=(kind:"google"|"apple")=>kind==="google"?
   "https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(address)+"&travelmode=driving":
   "https://maps.apple.com/?daddr="+encodeURIComponent(address)+"&dirflg=d";
 const eta=status==="delivered"?"Concluída":status==="arrived"?"Chegou":
   summary.minutes===null?"—":summary.minutes<1?"< 1 min":summary.minutes+" min";
 const statusText=status==="delivered"?"Entrega finalizada":status==="arrived"?"No destino":
   status==="on_route"?"A caminho":"Aguardando saída";
 const explanatory=summary.provider==="mapbox"?"ETA estimado para veículo · trânsito onde disponível":
   summary.provider==="demo"?"Trajeto e valores de demonstração":
   "A previsão aparece com GPS e destino confirmados";
 return <section className={"es-live-map"+(compact?" compact":"")}>
 <div className="es-map-head"><div><strong><Navigation size={16}/>{statusText}</strong>
 <small>{simulated?"Viagem de teste":updatedAt?"Posição compartilhada pelo entregador":"Aguardando posição do entregador"}</small></div>
 <span className="es-map-mode">{summary.provider==="mapbox"?"Rota atualizada":simulated?"Teste":updatedAt?"Rastreando":"Aguardando GPS"}</span></div>
 <div className="es-map-scene"><div className="es-map-surface" ref={host}/>
 <button type="button" className="es-map-center" onClick={recenter} aria-label="Centralizar mapa"><LocateFixed size={17}/></button>
 {!ready&&!error&&<div className="es-map-loading">Carregando mapa...</div>}</div>
 <div className="es-map-stats"><div><small>Chegada estimada</small><strong>{eta}</strong></div>
 <div><small>Distância restante</small><strong>{summary.km!==null?summary.km.toLocaleString("pt-BR")+" km":"—"}</strong></div>
 <div><small>Atualização</small><strong>{updatedAt?new Date(updatedAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):simulated?"Teste":"Sem GPS"}</strong></div></div>
 <div className="es-map-foot"><span>{explanatory}</span><div>
 {address&&<><a href={ext("google")} target="_blank" rel="noopener noreferrer">Google Maps</a>
 <a href={ext("apple")} target="_blank" rel="noopener noreferrer">Apple Maps</a></>}</div></div>
 {error&&<p className="es-map-issue" role="status"><MapPin size={13}/>{error}</p>}
 </section>;
}
