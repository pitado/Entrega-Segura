/**
 * Deep link oficial do Waze. Funciona em iOS/Android com o aplicativo ou no navegador.
 * Fonte: https://developers.google.com/waze/deeplinks
 * O destino por coordenadas é preferido ao endereço textual para evitar ambiguidades.
 */
export function wazeDirectionsUrl(
  coordinates?:{lat:number;lng:number}|null,
  address?:string|null
):string|null {
  const hasPoint=coordinates!=null&&Number.isFinite(coordinates.lat)&&Number.isFinite(coordinates.lng)&&
    Math.abs(coordinates.lat)<=90&&Math.abs(coordinates.lng)<=180;
  const destinationText=(address||"").trim();
  if(!hasPoint&&!destinationText)return null;
  const url=new URL("https://waze.com/ul");
  if(hasPoint&&coordinates)url.searchParams.set("ll",coordinates.lat+","+coordinates.lng);
  else url.searchParams.set("q",destinationText);
  url.searchParams.set("navigate","yes");
  url.searchParams.set("vehicle_type","motorcycle");
  url.searchParams.set("utm_source","entrega-segura");
  return url.toString();
}
