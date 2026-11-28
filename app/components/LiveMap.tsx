"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as LibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { loadMaplibre } from "./maplibre";

type Point = { lat: number; lng: number };
type Props = {
  courier?: Point | null;
  destination?: Point | null;
  store?: Point | null;
  /** Token de acompanhamento: com ele o mapa pede rota e previsão ao servidor (Mapbox, se configurado). */
  routeToken?: string | null;
  emptyText?: string;
  height?: number;
};
type Route = { minutes: number; distanceKm: number; points: [number, number][] };

function markerElement(kind: "courier" | "destination" | "store", label: string) {
  const el = document.createElement("div");
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", label);
  if (kind === "store") { el.className = "pt-marker-store"; return el; }
  el.className = "pt-marker";
  const img = document.createElement("img");
  img.src = kind === "courier" ? "/icons/entrega-moto.webp" : "/icons/entrega-destino.webp";
  img.alt = "";
  el.appendChild(img);
  return el;
}

export default function LiveMap({ courier, destination, store, routeToken, emptyText, height }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LibreMap | null>(null);
  const markers = useRef<Partial<Record<"courier" | "destination" | "store", Marker>>>({});
  const fitted = useRef("");
  const [ready, setReady] = useState(false);
  const [styleReady, setStyleReady] = useState(false);
  const [route, setRoute] = useState<Route | null>(null);
  const hasPoint = Boolean(courier || destination || store);
  const firstPoint = useRef<Point | null>(null);
  firstPoint.current = courier || destination || store || null;

  useEffect(() => {
    if (!hasPoint || map.current || !box.current) return;
    let cancelled = false;
    (async () => {
      const lib = await loadMaplibre();
      if (cancelled || !box.current || !firstPoint.current) return;
      const center = firstPoint.current;
      const instance = new lib.Map({
        container: box.current,
        style: "https://tiles.openfreemap.org/styles/positron",
        center: [center.lng, center.lat],
        zoom: 14,
        attributionControl: false,
      });
      instance.addControl(new lib.AttributionControl({ compact: true }), "bottom-left");
      instance.addControl(new lib.NavigationControl({ showCompass: false }), "bottom-right");
      instance.on("load", () => {
        instance.addSource("route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        instance.addLayer({ id: "route", type: "line", source: "route", paint: { "line-color": "#314dd0", "line-width": 5, "line-opacity": .8 }, layout: { "line-cap": "round", "line-join": "round" } });
        setStyleReady(true);
      });
      map.current = instance;
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [hasPoint]);

  useEffect(() => () => { map.current?.remove(); map.current = null; }, []);

  // Marcadores e enquadramento.
  useEffect(() => {
    const instance = map.current;
    if (!instance || !ready) return;
    let cancelled = false;
    (async () => {
      const lib = await loadMaplibre();
      if (cancelled) return;
      const entries = { courier, destination, store } as const;
      for (const kind of ["store", "destination", "courier"] as const) {
        const p = entries[kind];
        const existing = markers.current[kind];
        if (!p) { existing?.remove(); delete markers.current[kind]; continue; }
        if (existing) existing.setLngLat([p.lng, p.lat]);
        else {
          const label = kind === "courier" ? "Entregador" : kind === "destination" ? "Destino" : "Estabelecimento";
          markers.current[kind] = new lib.Marker({ element: markerElement(kind, label), anchor: kind === "store" ? "center" : "bottom" }).setLngLat([p.lng, p.lat]).addTo(instance);
        }
      }
      const pts = [courier, destination, store].filter(Boolean) as Point[];
      const key = [courier ? "c" : "", destination ? "d" : "", store ? "s" : ""].join("");
      if (pts.length && key !== fitted.current) {
        fitted.current = key;
        if (pts.length === 1) instance.easeTo({ center: [pts[0].lng, pts[0].lat], zoom: 15 });
        else {
          const bounds = new lib.LngLatBounds();
          pts.forEach(p => bounds.extend([p.lng, p.lat]));
          instance.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 600 });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [ready, courier, destination, store]);

  // Rota e previsão de chegada (no máximo uma consulta por minuto).
  const routeKey = routeToken && courier && destination ? `${routeToken}:${courier.lat.toFixed(3)}:${courier.lng.toFixed(3)}` : "";
  useEffect(() => {
    if (!routeKey || !routeToken) { setRoute(null); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/maps/route", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderToken: routeToken }) });
        if (!res.ok) { if (!cancelled) setRoute(null); return; }
        const data = await res.json();
        if (!cancelled && Array.isArray(data.points)) setRoute({ minutes: data.minutes, distanceKm: data.distanceKm, points: data.points });
      } catch { /* sem rota: o mapa continua com os marcadores */ }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [routeKey, routeToken]);

  useEffect(() => {
    const source = map.current?.getSource("route") as GeoJSONSource | undefined;
    if (!styleReady || !source) return;
    source.setData(route ? { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: route.points } } : { type: "FeatureCollection", features: [] });
  }, [route, styleReady]);

  return <div className="pt-map" style={height ? { height } : undefined}>
    <div ref={box} className="pt-map-canvas" />
    {!hasPoint && <div className="pt-map-empty">{emptyText || "Aguardando localização"}</div>}
    {route && <div className="pt-map-overlay">
      <span className="pt-map-chip">Chega em ~{route.minutes} min</span>
      <span className="pt-map-chip">{route.distanceKm.toLocaleString("pt-BR")} km</span>
    </div>}
  </div>;
}
