"use client";
import {useEffect,useRef,useState} from "react";
import {ExternalLink,MapPin,Navigation,Radio,Map as MapIcon} from "lucide-react";

type Config={googleKey:string|null;appleToken:string|null};
type Props={destination:string;latitude?:number|null;longitude?:number|null;updatedAt?:string|null;compact?:boolean};
declare global {interface Window {google?:any;mapkit?:any;__entregaGooglePromise?:Promise<void>}}
function mapLink(destination:string,provider:"google"|"apple") {
  return provider==="google"
    ?"https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(destination)+"&travelmode=driving"
    :"https://maps.apple.com/?daddr="+encodeURIComponent(destination)+"&dirflg=d";
}
function loadScript(src:string,id:string):Promise<void> {
  const exists=document.getElementById(id) as HTMLScriptElement|null;
  if(exists?.dataset.loaded==="true")return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const script=exists||document.createElement("script");
    if(!exists){script.id=id;script.src=src;script.async=true;document.head.appendChild(script);}
    script.addEventListener("load",()=>{script.dataset.loaded="true";resolve();},{once:true});
    script.addEventListener("error",()=>reject(new Error("Mapa indisponível")),{once:true});
  });
}
export default function MapSurface({destination,latitude,longitude,updatedAt,compact=false}:Props) {
  const target=useRef<HTMLDivElement|null>(null);
  const [config,setConfig]=useState<Config|null>(null);
  const [provider,setProvider]=useState<"google"|"apple">("google");
  const [issue,setIssue]=useState("");
  const hasPoint=typeof latitude==="number" && typeof longitude==="number" && Number.isFinite(latitude) && Number.isFinite(longitude);
  const fresh=!!updatedAt && Date.now()-new Date(updatedAt).getTime()<120000 && hasPoint;
  useEffect(()=>{fetch("/api/maps/config",{cache:"no-store"}).then(r=>r.json()).then((v:Config)=>{setConfig(v);if(!v.googleKey&&v.appleToken)setProvider("apple");}).catch(()=>setConfig({googleKey:null,appleToken:null}));},[]);
  useEffect(()=>{
    if(!target||!target.current||!config)return;
    let cancelled=false;
    const node=target.current;
    node.replaceChildren();
    setIssue("");
    if(provider==="google"&&config.googleKey){
      const url=new URL("https://maps.googleapis.com/maps/api/js");
      url.searchParams.set("key",config.googleKey);
      url.searchParams.set("v","weekly");
      url.searchParams.set("loading","async");
      url.searchParams.set("libraries","marker");
      const promise=window.__entregaGooglePromise ||= loadScript(url.toString(),"entrega-google-maps");
      promise.then(async()=>{
        if(cancelled||!target.current||!window.google)return;
        const G=window.google;
        const center=hasPoint?{lat:Number(latitude),lng:Number(longitude)}:{lat:-14.2,lng:-51.9};
        const map=new G.maps.Map(node,{center,zoom:hasPoint?14:4,mapId:"DEMO_MAP_ID",disableDefaultUI:true,zoomControl:true,gestureHandling:"cooperative",styles:[{featureType:"poi",stylers:[{visibility:"off"}]}]});
        const addMarker=async(position:{lat:number;lng:number},title:string)=>{
          try {const library=await G.maps.importLibrary("marker");new library.AdvancedMarkerElement({map,position,title});}
          catch{new G.maps.Marker({map,position,title});}
        };
        const bounds=new G.maps.LatLngBounds();
        if(hasPoint){const point={lat:Number(latitude),lng:Number(longitude)};await addMarker(point,"Posição do entregador");bounds.extend(point);}
        if(destination.trim()){
          new G.maps.Geocoder().geocode({address:destination},async(results:any[],status:string)=>{
            if(cancelled||status!=="OK"||!results?.[0])return;
            const ll=results[0].geometry.location;
            const point={lat:ll.lat(),lng:ll.lng()};
            await addMarker(point,"Destino");
            bounds.extend(point);
            map.fitBounds(bounds,60);
            if(!hasPoint)map.setZoom(15);
          });
        } else if(hasPoint)map.setCenter(center);
      }).catch(()=>!cancelled&&setIssue("Não foi possível carregar o Google Maps. Confira a chave e o domínio autorizado."));
    } else if(provider==="apple"&&config.appleToken){
      loadScript("https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js","entrega-apple-mapkit").then(()=>{
        if(cancelled||!window.mapkit)return;
        const M=window.mapkit;
        M.init({authorizationCallback:(done:(token:string)=>void)=>done(config.appleToken||""),language:"pt-BR"});
        const map=new M.Map(node,{showsCompass:M.FeatureVisibility.Hidden,showsMapTypeControl:false});
        if(hasPoint){
          const coordinate=new M.Coordinate(Number(latitude),Number(longitude));
          map.addAnnotation(new M.MarkerAnnotation(coordinate,{title:"Entregador"}));
          map.region=new M.CoordinateRegion(coordinate,new M.CoordinateSpan(0.035,0.035));
        }
        if(destination.trim()){
          const geocoder=new M.Geocoder();
          geocoder.lookup(destination,(error:unknown,data:any)=>{
            if(cancelled||error||!data?.results?.[0])return;
            const coord=data.results[0].coordinate;
            map.addAnnotation(new M.MarkerAnnotation(coord,{title:"Destino"}));
            if(!hasPoint)map.region=new M.CoordinateRegion(coord,new M.CoordinateSpan(0.025,0.025));
          });
        }
      }).catch(()=>!cancelled&&setIssue("MapKit JS indisponível. Confira o token Apple."));
    }
    return ()=>{cancelled=true;node.replaceChildren();};
  },[provider,config,destination,latitude,longitude,hasPoint]);
  const available=!!(provider==="google"?config?.googleKey:config?.appleToken);
  return <section className={"map-section"+(compact?" map-compact":"")} aria-label="Mapa da entrega">
    <div className="map-topline">
      <div className="map-heading"><MapIcon size={16}/><strong>Mapa da entrega</strong></div>
      <div className="map-providers" aria-label="Provedor do mapa">
        <button className={provider==="google"?"active":""} onClick={()=>setProvider("google")} disabled={!config?.googleKey} type="button">Google</button>
        <button className={provider==="apple"?"active":""} onClick={()=>setProvider("apple")} disabled={!config?.appleToken} type="button">Apple</button>
      </div>
    </div>
    <div className="map-stage">
      {available?<div className="map-canvas" ref={target}/>:<div className="map-no-key"><MapPin size={23} strokeWidth={1.4}/><strong>Mapa aguardando ativação</strong><span>Configure a chave do Google Maps ou o token MapKit JS no Worker para ver o mapa integrado.</span></div>}
    </div>
    {issue&&<p className="inline-error">{issue}</p>}
    <div className="map-bottom">
      <div className="map-location">
        {fresh?<><Radio size={15}/><span>Localização atualizada às {new Date(updatedAt!).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span></>:
          <><MapPin size={15}/><span>{hasPoint?"Sinal de localização desatualizado":"Aguardando GPS do entregador"}</span></>}
      </div>
      <div className="map-external">
        {destination&&<><a href={mapLink(destination,"google")} target="_blank" rel="noreferrer"><Navigation size={14}/> Google Maps <ExternalLink size={12}/></a><a href={mapLink(destination,"apple")} target="_blank" rel="noreferrer"><Navigation size={14}/> Apple Maps <ExternalLink size={12}/></a></>}
      </div>
    </div>
  </section>;
}
