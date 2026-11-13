"use client";
import {useEffect,useRef,useState} from "react";
import {LocateFixed,Navigation,MapPin} from "lucide-react";
export type MapPoint={lat:number;lng:number};
type Summary={minutes:number|null;km:number|null;real:boolean};
type Props={origin?:MapPoint|null;destination?:MapPoint|null;destinationAddress?:string;routePoints?:MapPoint[];simulated?:boolean;status?:string;updatedAt?:string|null;compact?:boolean};
declare global{interface Window{google?:any;maplibregl?:any;__esGooglePromise?:Promise<void>;__esLibrePromise?:Promise<void>}}
const startPoint={lat:-23.4205,lng:-51.9333};
const ll=(p:MapPoint):[number,number]=>[p.lng,p.lat];
const point=(p?:MapPoint|null):p is MapPoint=>Boolean(p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng));
function script(src:string,id:string):Promise<void>{
 return new Promise((resolve,reject)=>{
   const old=document.getElementById(id) as HTMLScriptElement|null;
   if(old?.dataset.ready==="yes")return resolve();
   const el=old||document.createElement("script");
   if(!old){el.id=id;el.src=src;el.async=true;document.head.appendChild(el);}
   el.addEventListener("load",()=>{el.dataset.ready="yes";resolve();},{once:true});
   el.addEventListener("error",()=>reject(new Error("Mapa indisponível")),{once:true});
 });
}
function badge(kind:"moto"|"dest"){
 const el=document.createElement("div");el.className="es-route-marker "+kind;
 el.innerHTML=kind==="moto"
   ? '<svg width="31" height="31" viewBox="0 0 48 48" fill="none" stroke="#fff" stroke-width="3.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="35" r="6"/><circle cx="38" cy="35" r="6"/><path d="m10 35 9-14 10 1 9 13M19 35h8l-6-10m9-3 3-8h8M17 19h8"/></svg>'
   : '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
 el.title=kind==="moto"?"Motoboy":"Destino";
 return el;
}
export default function LiveTripMap({origin,destination,destinationAddress="",routePoints,simulated=false,status="preparing",updatedAt,compact=false}:Props){
 const host=useRef<HTMLDivElement>(null);
 const m=useRef<any>(null),markers=useRef<any[]>([]),lines=useRef<any[]>([]),routeLock=useRef(0);
 const cachedDest=useRef<{address:string;point:MapPoint}|null>(null);
 const [config,setConfig]=useState<{googleKey:string|null}>({googleKey:null});
 const [backend,setBackend]=useState<"google"|"libre">("libre");
 const [ready,setReady]=useState(false),[error,setError]=useState("");
 const [summary,setSummary]=useState<Summary>({minutes:null,km:null,real:false});
 const [follow,setFollow]=useState(true);
 const src=point(origin)?origin:routePoints?.[0]||null;
 const dest=point(destination)?destination:null;
 const active=status==="on_route"||status==="arrived";
 useEffect(()=>{let cancel=false;fetch("/api/maps/config",{cache:"no-store"}).then(r=>r.json()).then(v=>{if(!cancel&&v.googleKey){setConfig(v);setBackend("google");}}).catch(()=>{});return()=>{cancel=true;};},[]);
 useEffect(()=>{
   let disposed=false;
   setReady(false);m.current=null;markers.current=[];lines.current=[];routeLock.current=0;setError("");
   if(!host.current)return;
   host.current.replaceChildren();
   async function init(){
     try{
       if(backend==="google"&&config.googleKey){
         await (window.__esGooglePromise ||= script("https://maps.googleapis.com/maps/api/js?key="+encodeURIComponent(config.googleKey)+"&v=weekly&loading=async","es-google-route"));
         if(disposed||!host.current||!window.google)return;
         m.current=new window.google.maps.Map(host.current,{center:src||dest||startPoint,zoom:14,disableDefaultUI:true,zoomControl:true,gestureHandling:"greedy"});
       }else{
         if(!document.getElementById("es-libre-css")){
           const link=document.createElement("link");link.id="es-libre-css";link.rel="stylesheet";link.href="https://cdn.jsdelivr.net/npm/maplibre-gl@5.6.1/dist/maplibre-gl.css";document.head.append(link);
         }
         await (window.__esLibrePromise ||= script("https://cdn.jsdelivr.net/npm/maplibre-gl@5.6.1/dist/maplibre-gl.js","es-libre-route"));
         if(disposed||!host.current||!window.maplibregl)return;
         const L=window.maplibregl;
         m.current=new L.Map({container:host.current,style:"https://tiles.openfreemap.org/styles/positron",center:ll(src||dest||startPoint),zoom:14,dragRotate:false,touchPitch:false});
         m.current.addControl(new L.NavigationControl({showCompass:false}),"top-right");
         await new Promise<void>(resolve=>m.current.loaded()?resolve():m.current.once("load",resolve));
       }
       if(!disposed)setReady(true);
     }catch{if(!disposed){setError("Mapa indisponível. Use o link de navegação.");if(backend==="google")setBackend("libre");}}
   }
   void init();
   return()=>{disposed=true;try{if(backend==="libre")m.current?.remove();}catch{}m.current=null;};
 },[backend,config.googleKey]);
 useEffect(()=>{
   if(!ready||!m.current)return;
   let cancelled=false;
   const M=m.current,L=window.maplibregl,G=window.google?.maps;
   function updateMarker(index:number,p:MapPoint|null){
     const previous=markers.current[index];
     if(!p){if(previous){backend==="google"?previous.setMap(null):previous.remove();markers.current[index]=null;}return;}
     if(previous){backend==="google"?previous.setPosition(p):previous.setLngLat(ll(p));return;}
     const kind=index===0?"moto":"dest";
     if(backend==="google"){
       const el=badge(kind);
       const svg=el.innerHTML;
       markers.current[index]=new G.Marker({map:M,position:p,icon:{url:"data:image/svg+xml;charset=utf-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="23" fill="'+(kind==="moto"?"#355b70":"#bd7255")+'"/>'+svg+'</svg>'),scaledSize:new G.Size(38,38),anchor:new G.Point(19,19)},title:kind==="moto"?"Entregador":"Destino"});
     }else markers.current[index]=new L.Marker({element:badge(kind)}).setLngLat(ll(p)).addTo(M);
   }
   function render(end:MapPoint|null){
     if(cancelled)return;
     updateMarker(0,src);updateMarker(1,end);
     if(src&&end&&follow){
       if(backend==="google"){const b=new G.LatLngBounds();b.extend(src);b.extend(end);M.fitBounds(b,55);}
       else M.fitBounds([ll(src),ll(end)],{padding:60,maxZoom:15,duration:500});
     }else if(src&&follow){
       if(backend==="google")M.panTo(src);
       else M.easeTo({center:ll(src),duration:450});
     }
     if(backend==="libre"){
       const coordinates=(simulated&&routePoints?.length?routePoints:[src,end]).filter((x):x is MapPoint=>point(x)).map(ll);
       if(coordinates.length>1){
         const data={type:"Feature",properties:{},geometry:{type:"LineString",coordinates}};
         const existing=M.getSource("es-route");
         if(existing)existing.setData(data);
         else{M.addSource("es-route",{type:"geojson",data});M.addLayer({id:"es-route-line",type:"line",source:"es-route",layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":"#426f84","line-width":5,"line-opacity":.88}});}
       }
       if(simulated&&src&&routePoints?.length){
         const i=routePoints.findIndex(p=>p.lat===src.lat&&p.lng===src.lng);
         setSummary({minutes:Math.ceil(Math.max(0,(routePoints.length-1-Math.max(i,0))*3)/60),km:null,real:false});
       }else setSummary({minutes:null,km:null,real:false});
       return;
     }
     if(backend==="google"&&src&&end&&G){
       const n=Date.now();
       if(n-routeLock.current<45000)return;
       routeLock.current=n;
       void(async()=>{
         try{
           const lib=await G.importLibrary("routes");
           const result=await lib.Route.computeRoutes({origin:src,destination:end,travelMode:"DRIVING",routingPreference:"TRAFFIC_AWARE",fields:["durationMillis","distanceMeters","path"]});
           if(cancelled||!result.routes?.length)return;
           lines.current.forEach((l:any)=>l.setMap(null));
           lines.current=result.routes[0].createPolylines();
           lines.current.forEach((l:any)=>{l.setOptions({strokeColor:"#426f84",strokeWeight:5,strokeOpacity:.9});l.setMap(M);});
           setSummary({minutes:Math.max(1,Math.ceil(result.routes[0].durationMillis/60000)),km:Math.round(result.routes[0].distanceMeters/100)/10,real:true});
         }catch{if(!cancelled)setError("Para calcular rota e previsão, habilite a Routes API no Google Cloud.");}
       })();
     }
   }
   let end=dest;
   if(!end&&cachedDest.current?.address===destinationAddress)end=cachedDest.current.point;
   if(!end&&backend==="google"&&destinationAddress.trim()&&G){
     new G.Geocoder().geocode({address:destinationAddress},(results:any[],status:string)=>{
       if(cancelled)return;
       if(status==="OK"&&results?.length){const x=results[0].geometry.location;end={lat:x.lat(),lng:x.lng()};cachedDest.current={address:destinationAddress,point:end!};}
       render(end);
     });
   }else render(end);
   return()=>{cancelled=true;};
 },[ready,backend,src?.lat,src?.lng,dest?.lat,dest?.lng,destinationAddress,simulated,status,follow,routePoints?.length]);
 function center(){
   setFollow(true);
   if(!m.current)return;
   const pts=[src,dest].filter((p):p is MapPoint=>point(p));
   if(!pts.length)return;
   if(backend==="google"){const b=new window.google.maps.LatLngBounds();pts.forEach(p=>b.extend(p));m.current.fitBounds(b,55);}
   else m.current.fitBounds(pts.map(ll),{padding:55,maxZoom:15,duration:550});
 }
 const address=dest?dest.lat+","+dest.lng:destinationAddress;
 const external=(kind:"google"|"apple")=>kind==="google"?"https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(address)+"&travelmode=driving":"https://maps.apple.com/?daddr="+encodeURIComponent(address)+"&dirflg=d";
 const eta=status==="delivered"?"Concluída":status==="arrived"?"Chegou":summary.minutes===null?"—":summary.minutes<1?"< 1 min":summary.minutes+" min";
 return <section className={"es-live-map"+(compact?" compact":"")}>
 <div className="es-map-head"><div><strong><Navigation size={16}/> {active?"Entrega em andamento":"Mapa da entrega"}</strong><small>{simulated?"Cenário de teste":updatedAt?"Última posição registrada":"Aguardando posição"}</small></div><span className="es-map-mode">{summary.real?"Google Routes":simulated?"Simulação":"Mapa interativo"}</span></div>
 <div className="es-map-scene"><div className="es-map-surface" ref={host}/><button type="button" className="es-map-center" onClick={center} aria-label="Centralizar mapa"><LocateFixed size={17}/></button>{!ready&&!error&&<div className="es-map-loading">Carregando mapa...</div>}</div>
 <div className="es-map-stats"><div><small>Chegada estimada</small><strong>{eta}</strong></div><div><small>Distância restante</small><strong>{summary.km!==null?summary.km.toLocaleString("pt-BR")+" km":"—"}</strong></div><div><small>Atualização</small><strong>{updatedAt?new Date(updatedAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):simulated?"Em teste":"Sem GPS"}</strong></div></div>
 <div className="es-map-foot"><span>{summary.real?"Estimativa pelo Google · rota para automóvel":simulated?"Tempo apenas da simulação":"Tempo disponível com Google Routes e localização"}</span><div><a href={external("google")} target="_blank" rel="noopener noreferrer">Google Maps</a><a href={external("apple")} target="_blank" rel="noopener noreferrer">Apple Maps</a></div></div>
 {error&&<p className="es-map-issue" role="status"><MapPin size={13}/>{error}</p>}
 </section>;
}
