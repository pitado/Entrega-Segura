"use client";
import LiveTripMap from "./LiveTripMap";
type Props={destination:string;latitude?:number|null;longitude?:number|null;updatedAt?:string|null;compact?:boolean};
export default function MapSurface({destination,latitude,longitude,updatedAt,compact=false}:Props){
 const point=typeof latitude==="number" && typeof longitude==="number" &&
 Number.isFinite(latitude) && Number.isFinite(longitude)?{lat:latitude,lng:longitude}:null;
 const fresh=!!updatedAt&&Date.now()-new Date(updatedAt).getTime()<120000;
 return <LiveTripMap destinationAddress={destination} origin={fresh?point:null} updatedAt={fresh?updatedAt:null} status={fresh?"on_route":"preparing"} compact={compact}/>;
}
