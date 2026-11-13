"use client";
import MapSurface from "../../components/MapSurface";
export type Point={lat:number;lng:number};
type Props={courier?:Point|null;destination?:Point|null;address?:string;source?:string|null;updatedAt?:string|null};
export function RouteLinks({destination,address}:{destination?:Point|null;address?:string}){
  const target=destination?destination.lat+","+destination.lng:(address||"");
  if(!target)return null;
  return <div className="lab-map-links">
    <a className="button ghost-button" href={"https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(target)+"&travelmode=driving"} target="_blank" rel="noreferrer">Abrir rota no Google Maps</a>
    <a className="button ghost-button" href={"https://maps.apple.com/?daddr="+encodeURIComponent(target)+"&dirflg=d"} target="_blank" rel="noreferrer">Abrir rota no Apple Maps</a>
  </div>;
}
export default function DeliveryMap({courier,destination,address,source,updatedAt}:Props){
  return <div className="lab-map-wrapper">
    <MapSurface destination={address||""} destinationLatitude={destination?.lat??null} destinationLongitude={destination?.lng??null} latitude={courier?.lat??null} longitude={courier?.lng??null} simulated={source==="simulation"} status={courier?"on_route":"preparing"} updatedAt={updatedAt||null}/>
    
  </div>;
}
