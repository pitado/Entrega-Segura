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

const icons = {
  courier: '<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
  store: '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20v3a2 2 0 0 1-4 0 2 2 0 0 1-4 0 2 2 0 0 1-4 0 2 2 0 0 1-4 0 2 2 0 0 1-4 0Z"/>',
};

// Marcadores no estilo Pitou: o destino é o ponto final da rota, como na logo.
function markerElement(kind: "courier" | "destination" | "store", label: string) {
  const el = document.createElement("div");
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", label);
  el.className = "pt-marker pt-marker-" + kind;
  el.innerHTML = kind === "destination" ? "<i></i>"
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[kind]}</svg>`;
  return el;
}

// Pinta o mapa base (OpenFreeMap Positron) com as cores do Pitou: fundo escuro, ruas
// discretas, verde só nos parques. Funciona pelo tipo de camada, então não depende dos nomes exatos.
function paintPitou(map: LibreMap) {
  const set = (id: string, prop: string, value: unknown) => { try { map.setPaintProperty(id, prop as never, value as never); } catch { /* camada sem essa propriedade */ } };
  for (const layer of map.getStyle().layers || []) {
    const id = layer.id, name = (id + " " + ("source-layer" in layer ? layer["source-layer"] || "" : "")).toLowerCase();
    if (layer.type === "background") set(id, "background-color", "#0E1118");
    else if (layer.type === "fill") {
      const color = /water|ocean|lake|river/.test(name) ? "#0F1B26"
        : /park|grass|wood|forest|landcover|green|garden|cemetery|pitch/.test(name) ? "#16201A"
        : /building/.test(name) ? "#181D29" : "#11151E";
      set(id, "fill-color", color); set(id, "fill-outline-color", color); set(id, "fill-opacity", 1);
    } else if (layer.type === "fill-extrusion") set(id, "fill-extrusion-color", "#181D29");
    else if (layer.type === "line") {
      const color = /water|river|stream|canal/.test(name) ? "#13222E"
        : /boundary|admin/.test(name) ? "#2A3142"
        : /rail/.test(name) ? "#1B2130"
        : /casing|outline/.test(name) ? "#0A0D14"
        : /motorway|trunk|primary|major/.test(name) ? "#2C3447" : "#202634";
      set(id, "line-color", color);
    } else if (layer.type === "symbol") {
      set(id, "text-color", /water/.test(name) ? "#4A6275" : "#8A94AD");
      set(id, "text-halo-color", "#0B0E15");
      set(id, "text-halo-width", 1.4);
      set(id, "icon-opacity", .55);
    }
  }
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
        paintPitou(instance);
        instance.addSource("route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        const round = { "line-cap": "round", "line-join": "round" } as const;
        instance.addLayer({ id: "route-casing", type: "line", source: "route", paint: { "line-color": "#080A10", "line-width": 11, "line-opacity": .85 }, layout: round });
        instance.addLayer({ id: "route", type: "line", source: "route", paint: { "line-color": "#C3EA5C", "line-width": 6 }, layout: round });
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
          markers.current[kind] = new lib.Marker({ element: markerElement(kind, label), anchor: "center" }).setLngLat([p.lng, p.lat]).addTo(instance);
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
          instance.fitBounds(bounds, { padding: { top: 80, bottom: 50, left: 50, right: 70 }, maxZoom: 16, duration: 600 });
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
