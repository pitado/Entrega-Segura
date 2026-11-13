"use client";
import MapSurface from "../../components/MapSurface";
import {wazeDirectionsUrl} from "../../../lib/navigation";
export type Point={lat:number;lng:number};
type Props={courier?:Point|null;destination?:Point|null;address?:string;source?:string|null;updatedAt?:string|null;orderToken?:string};
export function RouteLinks({destination,address}:{destination?:Point|null;address?:string}){
 const target=destination?destination.lat+","+destination.lng:(address||"");
 const wazeLink=wazeDirectionsUrl(destination,address);
 if(!target)return null;
 return <div className="lab-map-links">
  {wazeLink&&<a className="button primary" href={wazeLink} target="_blank" rel="noopener noreferrer">Navegar com Waze</a>}
  <a className="button ghost-button" href={"https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(target)+"&travelmode=driving"} target="_blank" rel="noopener noreferrer">Google Maps</a>
  <a className="button ghost-button" href={"https://maps.apple.com/?daddr="+encodeURIComponent(target)+"&dirflg=d"} target="_blank" rel="noopener noreferrer">Apple Maps</a>
 </div>;
}
export default function DeliveryMap({courier,destination,address,source,updatedAt,orderToken}:Props){
 return <div className="lab-map-wrapper"><MapSurface destination={address||""}
  destinationLatitude={destination?.lat??null} destinationLongitude={destination?.lng??null}
  latitude={courier?.lat??null} longitude={courier?.lng??null} orderToken={orderToken}
  simulated={source==="simulation"} status={courier?"on_route":"preparing"}
  updatedAt={updatedAt||null}/></div>;
}
