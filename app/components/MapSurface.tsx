"use client";
import LiveTripMap from "./LiveTripMap";
type Props={destination:string;latitude?:number|null;longitude?:number|null;destinationLatitude?:number|null;destinationLongitude?:number|null;status?:string;simulated?:boolean;updatedAt?:string|null;compact?:boolean};
export default function MapSurface({destination,latitude,longitude,destinationLatitude,destinationLongitude,status="preparing",simulated=false,updatedAt,compact=false}:Props){
 const position=typeof latitude==="number"&&typeof longitude==="number"&&Number.isFinite(latitude)&&Number.isFinite(longitude)?{lat:latitude,lng:longitude}:null;
 const target=typeof destinationLatitude==="number"&&typeof destinationLongitude==="number"&&Number.isFinite(destinationLatitude)&&Number.isFinite(destinationLongitude)?{lat:destinationLatitude,lng:destinationLongitude}:null;
 const fresh=Boolean(updatedAt&&Date.now()-new Date(updatedAt).getTime()<120000);
 return <LiveTripMap destinationAddress={destination} destination={target} origin={fresh?position:null} updatedAt={fresh?updatedAt:null} status={status} simulated={simulated} compact={compact}/>;
}
