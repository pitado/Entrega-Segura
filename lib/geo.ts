export type Point = { lat: number; lng: number };

/** Distância em metros entre dois pontos (fórmula de haversine). Usada no servidor e no navegador. */
export function distanceMeters(a: Point, b: Point): number {
  const rad = Math.PI / 180, r = 6371000;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
}
