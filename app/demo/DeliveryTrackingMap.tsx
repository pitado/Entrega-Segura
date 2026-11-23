"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Expand, Minimize2, Minus, Navigation, Plus, Route, X, Clock3, LocateFixed } from "lucide-react";
import type { Map as LibreMap, Marker as LibreMarker, GeoJSONSource } from "maplibre-gl";
import { wazeDirectionsUrl } from "../../lib/navigation";
import "maplibre-gl/dist/maplibre-gl.css";
import "./delivery-map.css";

type Coordinate = [number, number];
type DeliveryStatus = "preparing" | "on_route" | "arrived" | "delivered";
type RouteResponse = { points?: number[][]; minutes?: number; distanceKm?: number };
type RouteEstimate = { minutes: number; distanceKm: number };
type Props = {
  status: DeliveryStatus;
  step: number;
  destinationLabel: string;
  children: ReactNode;
};

// These are the existing demo's geographic waypoints, not a real courier GPS feed.
const DEMO_PATH: Coordinate[] = [
  [-51.93566, -23.42690], [-51.93502, -23.42635],
  [-51.93420, -23.42575], [-51.93347, -23.42513],
  [-51.93272, -23.42458], [-51.93205, -23.42396],
  [-51.93125, -23.42340], [-51.93054, -23.42281],
  [-51.92980, -23.42218], [-51.92915, -23.42154],
  [-51.92850, -23.42083], [-51.92776, -23.42018],
];
const finalPosition = DEMO_PATH[DEMO_PATH.length - 1];
const styleUrl = "https://tiles.openfreemap.org/styles/positron";

function routeFeature(coordinates: Coordinate[]) {
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "LineString" as const, coordinates },
  };
}
function validLine(points: unknown): points is Coordinate[] {
  return Array.isArray(points) && points.length >= 2 && points.length <= 5000 &&
    points.every(point => Array.isArray(point) && point.length >= 2 &&
      typeof point[0] === "number" && Number.isFinite(point[0]) && Math.abs(point[0]) <= 180 &&
      typeof point[1] === "number" && Number.isFinite(point[1]) && Math.abs(point[1]) <= 90);
}

function MapCanvas({ step, routePoints, expanded }: {
  step: number;
  routePoints: Coordinate[];
  expanded: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LibreMap | null>(null);
  const courier = useRef<LibreMarker | null>(null);
  const routeRef = useRef(routePoints);
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const current = DEMO_PATH[Math.max(0, Math.min(DEMO_PATH.length - 1, step))];

  useEffect(() => { routeRef.current = routePoints; }, [routePoints]);

  useEffect(() => {
    let disposed = false;

    async function prepare() {
      try {
        const maplibregl = await import("maplibre-gl");
        if (disposed || !container.current) return;
        const instance = new maplibregl.Map({
          container: container.current,
          style: styleUrl,
          center: [-51.9315, -23.424],
          zoom: 13.2,
          pitch: 0,
          attributionControl: false,
        });
        map.current = instance;
        instance.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

        const scooterElement = document.createElement("div");
        scooterElement.className = "trip-courier-marker";
        const scooterImage = document.createElement("img");
        scooterImage.src = "/icons/entrega-moto-v1.svg";
        scooterImage.alt = "";
        scooterElement.appendChild(scooterImage);
        courier.current = new maplibregl.Marker({ element: scooterElement, anchor: "center" })
          .setLngLat(current).addTo(instance);

        const destinationElement = document.createElement("div");
        destinationElement.className = "trip-destination-marker";
        const destinationImage = document.createElement("img");
        destinationImage.src = "/icons/entrega-destino-v1.svg";
        destinationImage.alt = "";
        destinationElement.appendChild(destinationImage);
        new maplibregl.Marker({ element: destinationElement, anchor: "bottom" })
          .setLngLat(finalPosition).addTo(instance);

        instance.once("load", () => {
          if (disposed) return;
          instance.addSource("entrega-route", {
            type: "geojson",
            data: routeFeature(routeRef.current),
          });
          instance.addLayer({
            id: "entrega-route-outline",
            type: "line",
            source: "entrega-route",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#fff", "line-width": 12, "line-opacity": 0.96 },
          });
          instance.addLayer({
            id: "entrega-route-main",
            type: "line",
            source: "entrega-route",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#667ff4", "line-width": 7 },
          });
          const bounds = new maplibregl.LngLatBounds();
          DEMO_PATH.forEach(position => bounds.extend(position));
          instance.fitBounds(bounds, {
            padding: expanded
              ? { top: 170, bottom: 260, left: 45, right: 45 }
              : { top: 48, bottom: 48, left: 45, right: 45 },
            maxZoom: 15.5,
            duration: 0,
          });
          setLoaded(true);
        });
      } catch {
        if (!disposed) setUnavailable(true);
      }
    }
    void prepare();
    return () => {
      disposed = true;
      courier.current = null;
      map.current?.remove();
      map.current = null;
    };
    // This component mounts separately for the compact and expanded maps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  useEffect(() => {
    courier.current?.setLngLat(current);
  }, [current]);

  useEffect(() => {
    if (!loaded) return;
    const source = map.current?.getSource("entrega-route") as GeoJSONSource | undefined;
    source?.setData(routeFeature(routePoints));
  }, [routePoints, loaded]);

  function fitRoute() {
    const instance = map.current;
    if (!instance) return;
    void import("maplibre-gl").then(module => {
      const bounds = new module.LngLatBounds();
      DEMO_PATH.forEach(position => bounds.extend(position));
      instance.fitBounds(bounds, {
        padding: expanded
          ? { top: 170, bottom: 260, left: 45, right: 45 }
          : { top: 48, bottom: 48, left: 45, right: 45 },
        maxZoom: 15.5,
        duration: 600,
      });
    });
  }

  return <div className="trip-map-canvas">
    <div className="trip-map-static" aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M13 80 Q29 67 35 69 T53 52 T70 39 T86 23"
          fill="none" stroke="white" strokeWidth="3.8" strokeLinecap="round" />
        <path d="M13 80 Q29 67 35 69 T53 52 T70 39 T86 23"
          fill="none" stroke="#7189f9" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <img className="trip-static-courier" src="/icons/entrega-moto-v1.svg" alt="" />
      <img className="trip-static-destination" src="/icons/entrega-destino-v1.svg" alt="" />
    </div>
    <div ref={container} className="trip-map-webgl" aria-label="Mapa interativo de Maringá" />
    {unavailable && <span className="trip-map-fallback-notice" role="status">Mapa interativo indisponível. Exibindo prévia.</span>}
    <div className="trip-map-zoom" role="group" aria-label="Controles de mapa">
      <button type="button" aria-label="Aproximar mapa" disabled={!loaded} onClick={() => map.current?.zoomIn()}><Plus size={19} /></button>
      <button type="button" aria-label="Afastar mapa" disabled={!loaded} onClick={() => map.current?.zoomOut()}><Minus size={19} /></button>
      {expanded && <button type="button" aria-label="Mostrar rota inteira" disabled={!loaded} onClick={fitRoute}><LocateFixed size={20} /></button>}
    </div>
  </div>;
}

export default function DeliveryTrackingMap({ status, step, destinationLabel, children }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [routePoints, setRoutePoints] = useState<Coordinate[]>(DEMO_PATH);
  const [estimate, setEstimate] = useState<RouteEstimate | null>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const waze = wazeDirectionsUrl({ lat: finalPosition[1], lng: finalPosition[0] });

  useEffect(() => {
    const controller = new AbortController();
    async function loadRoadRoute() {
      try {
        const response = await fetch("/api/maps/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ demoStep: 0 }),
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json() as RouteResponse;
        if (!validLine(data.points)) return;
        setRoutePoints(data.points);
        if (typeof data.minutes === "number" && Number.isFinite(data.minutes) &&
            typeof data.distanceKm === "number" && Number.isFinite(data.distanceKm)) {
          setEstimate({ minutes: data.minutes, distanceKm: data.distanceKm });
        }
      } catch {
        // Without configured directions, keep the clearly labeled illustrative route.
      }
    }
    void loadRoadRoute();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onEscape);
      openButton.current?.focus();
    };
  }, [expanded]);

  const caption = status === "preparing" ? "Aguardando saída"
    : status === "on_route" ? "Entrega em andamento"
    : status === "arrived" ? "Entregador no destino" : "Entrega concluída";

  return <>
    <section className="trip-tracking-module" aria-label="Mapa e progresso da entrega">
      <div className="trip-tracking-viewport">
        <MapCanvas step={step} routePoints={routePoints} expanded={false} />
        <div className="trip-map-topbar">
          <span className="trip-tracking-chip"><Route size={18} aria-hidden="true" /> Trajeto simulado</span>
          <span className="trip-tracking-city">Maringá</span>
          <button ref={openButton} type="button" className="trip-tracking-icon-button"
            aria-label="Ampliar mapa em tela cheia" onClick={() => setExpanded(true)}><Expand size={20} /></button>
        </div>
      </div>
      <div className="trip-tracking-progress">
        <div className="trip-tracking-status"><span className="trip-tracking-led" />{caption}</div>
        {children}
      </div>
    </section>
    {expanded && createPortal(
      <div className="trip-map-fullscreen" role="dialog" aria-modal="true" aria-label="Acompanhamento do trajeto em tela cheia">
        <MapCanvas step={step} routePoints={routePoints} expanded />
        <div className="trip-map-floating-head">
          <div className="trip-map-title-row">
            <span className="trip-map-title-icon"><Navigation size={23} /></span>
            <div className="trip-map-title-copy">
              <strong>Acompanhando entrega</strong>
              <span>{destinationLabel} · simulação</span>
            </div>
            <button type="button" className="trip-map-close" aria-label="Fechar mapa em tela cheia"
              onClick={() => setExpanded(false)}><X size={23} /></button>
          </div>
          <div className="trip-map-metrics">
            <div><Clock3 size={20} /><span>Chegada estimada<strong>{estimate ? String(estimate.minutes) + " min" : "—"}</strong></span></div>
            <div><Route size={20} /><span>Distância restante<strong>{estimate ? estimate.distanceKm.toLocaleString("pt-BR") + " km" : "—"}</strong></span></div>
          </div>
          {!estimate && <span className="trip-map-metric-note">Estimativa indisponível sem serviço de rotas configurado.</span>}
        </div>
        <div className="trip-map-bottom-sheet">
          <span className="trip-map-sheet-handle" aria-hidden="true" />
          <div className="trip-map-sheet-title"><span className="trip-tracking-led" /><strong>{caption}</strong>
            <span className="trip-map-demo-pill">Simulação</span></div>
          {children}
          {waze && <a href={waze} target="_blank" rel="noopener noreferrer" className="trip-map-waze">
            Abrir no Waze <Navigation size={20} aria-hidden="true" />
          </a>}
          <p className="trip-map-disclaimer">Destino de teste em Maringá. Confira o destino antes de navegar.</p>
        </div>
        <button type="button" className="trip-map-collapse" onClick={() => setExpanded(false)}>
          <Minimize2 size={17} /> Voltar ao site
        </button>
      </div>, document.body)}
  </>;
}
