"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Clock3, Expand, LocateFixed, Minus, Navigation, Plus, Route, X } from "lucide-react";
import type { GeoJSONSource, Map as LibreMap, Marker as LibreMarker } from "maplibre-gl";
import { wazeDirectionsUrl } from "../../lib/navigation";
import "maplibre-gl/dist/maplibre-gl.css";
import "./delivery-map.css";

type Coordinate = [number, number];
type DeliveryStatus = "preparing" | "on_route" | "arrived" | "delivered";
type RouteResponse = { points?: number[][]; minutes?: number; distanceKm?: number };
type Directions = { step: number; points: Coordinate[]; minutes?: number; distanceKm?: number };
type Props = {
  orderId: number;
  status: DeliveryStatus;
  step: number;
  destinationLabel: string;
  children: ReactNode;
};

const DEMO_PATH: Coordinate[] = [
  [-51.93566, -23.42690], [-51.93502, -23.42635],
  [-51.93420, -23.42575], [-51.93347, -23.42513],
  [-51.93272, -23.42458], [-51.93205, -23.42396],
  [-51.93125, -23.42340], [-51.93054, -23.42281],
  [-51.92980, -23.42218], [-51.92915, -23.42154],
  [-51.92850, -23.42083], [-51.92776, -23.42018],
];
const LAST_STEP = DEMO_PATH.length - 1;
const DESTINATION = DEMO_PATH[LAST_STEP];
const SCOOTER_ICON = "/icons/entrega-moto.webp";
const DESTINATION_ICON = "/icons/entrega-destino.webp";
const COMPACT_PREVIEW_PATH = "M12 77 C20 77 23 72 29 68 S38 68 44 62 S47 53 54 52 S63 51 69 45 S77 46 83 42";
const FULL_PREVIEW_PATH = "M12 68 C20 68 23 65 29 61 S38 61 44 55 S47 45 54 43 S63 43 69 35 S77 33 83 26";
const statusLabels: Record<DeliveryStatus, string> = {
  preparing: "Aguardando saída",
  on_route: "Entrega em andamento",
  arrived: "Entregador no destino",
  delivered: "Entrega concluída",
};

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
      Number.isFinite(point[0]) && Math.abs(point[0]) <= 180 &&
      Number.isFinite(point[1]) && Math.abs(point[1]) <= 90);
}

function mapMarker(className: string, imageUrl: string, label: string) {
  const element = document.createElement("div");
  element.className = className;
  element.setAttribute("role", "img");
  element.setAttribute("aria-label", label);
  const image = document.createElement("img");
  image.src = imageUrl;
  image.alt = "";
  element.appendChild(image);
  return element;
}

function MapCanvas({ step, routePoints, expanded, header, footer }: {
  step: number;
  routePoints: Coordinate[];
  expanded?: boolean;
  header: ReactNode;
  footer?: ReactNode;
}) {
  const scene = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const map = useRef<LibreMap | null>(null);
  const courier = useRef<LibreMarker | null>(null);
  const fallbackBike = useRef<HTMLImageElement>(null);
  const fallbackRoute = useRef<SVGPathElement>(null);
  const fallbackTravelled = useRef<SVGPolylineElement>(null);
  const previewProgress = useRef(step / LAST_STEP);
  const current = DEMO_PATH[step];
  const previewPath = expanded ? FULL_PREVIEW_PATH : COMPACT_PREVIEW_PATH;
  const [mapState, setMapState] = useState<"loading" | "ready" | "fallback">("loading");
  const travelled = useMemo(() => step === 0 ? [DEMO_PATH[0], DEMO_PATH[0]] : DEMO_PATH.slice(0, step + 1), [step]);
  const latest = useRef({ routePoints, travelled, current });

  useEffect(() => { latest.current = { routePoints, travelled, current }; }, [routePoints, travelled, current]);

  function fitRoute(duration: number) {
    const instance = map.current;
    if (!instance || !container.current) return;
    const { clientWidth: width, clientHeight: height } = container.current;
    const top = (head.current?.offsetHeight ?? 0) + 18;
    const bottom = (sheet.current?.offsetHeight ?? 0) + (expanded ? 18 : 35);
    const edge = Math.min(48, Math.floor(width * .16));
    const padding = {
      top: Math.min(top, Math.floor(height * .35)),
      bottom: Math.min(bottom, Math.floor(height * .5)),
      left: edge,
      right: edge,
    };
    let west = DESTINATION[0], south = DESTINATION[1], east = west, north = south;
    for (const [lng, lat] of latest.current.routePoints) {
      west = Math.min(west, lng);
      south = Math.min(south, lat);
      east = Math.max(east, lng);
      north = Math.max(north, lat);
    }
    instance.fitBounds([[west, south], [east, north]], { padding, maxZoom: 15.5, duration });
  }

  useEffect(() => {
    if (!expanded || !sheet.current || !scene.current) return;
    const overlay = sheet.current;
    const root = scene.current;
    const resize = new ResizeObserver(() => {
      root.style.setProperty("--trip-sheet-height", overlay.offsetHeight + "px");
    });
    resize.observe(overlay);
    return () => resize.disconnect();
  }, [expanded]);

  useEffect(() => {
    let disposed = false;
    let ready = false;
    const deadline = window.setTimeout(() => {
      if (!ready) setMapState("fallback");
    }, 10000);

    async function prepare() {
      try {
        const maplibregl = await import("maplibre-gl");
        if (disposed || !container.current) return;
        const instance = new maplibregl.Map({
          container: container.current,
          style: "https://tiles.openfreemap.org/styles/positron",
          center: [-51.9315, -23.424],
          zoom: 13.2,
          attributionControl: false,
          cooperativeGestures: !expanded,
        });
        map.current = instance;
        instance.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

        courier.current = new maplibregl.Marker({
          element: mapMarker("trip-courier-marker", SCOOTER_ICON, "Posição do entregador"),
          anchor: "bottom",
        }).setLngLat(latest.current.current).addTo(instance);

        new maplibregl.Marker({
          element: mapMarker("trip-destination-marker", DESTINATION_ICON, "Destino da entrega"),
          anchor: "bottom",
        }).setLngLat(DESTINATION).addTo(instance);

        instance.on("error", ({ error }) => {
          if (!disposed && !ready && /style|source|tile|fetch|network|webgl/i.test(error?.message ?? "")) {
            setMapState("fallback");
          }
        });
        instance.once("load", () => {
          if (disposed) return;
          instance.addSource("entrega-route", { type: "geojson", data: routeFeature(latest.current.routePoints) });
          instance.addSource("entrega-travelled", { type: "geojson", data: routeFeature(latest.current.travelled) });
          const layout = { "line-cap": "round", "line-join": "round" } as const;
          instance.addLayer({
            id: "entrega-route-outline", type: "line", source: "entrega-route", layout,
            paint: { "line-color": "#fff", "line-width": 11 },
          });
          instance.addLayer({
            id: "entrega-route-main", type: "line", source: "entrega-route", layout,
            paint: { "line-color": "#a4aff7", "line-width": 6.5 },
          });
          instance.addLayer({
            id: "entrega-route-travelled", type: "line", source: "entrega-travelled", layout,
            paint: { "line-color": "#5465ec", "line-width": 6.5 },
          });
          fitRoute(0);
          ready = true;
          window.clearTimeout(deadline);
          setMapState("ready");
        });
      } catch {
        if (!disposed) setMapState("fallback");
      }
    }

    void prepare();
    return () => {
      disposed = true;
      window.clearTimeout(deadline);
      courier.current = null;
      map.current?.remove();
      map.current = null;
    };
    // The embedded and expanded map have independent viewports.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  useEffect(() => {
    const destination = step / LAST_STEP;
    const start = previewProgress.current;
    const origin = courier.current?.getLngLat();
    const path = fallbackRoute.current;
    const pathLength = path?.getTotalLength() ?? 0;
    const started = performance.now();
    let frame = 0;

    const draw = (t: number) => {
      const progress = start + (destination - start) * t;
      previewProgress.current = progress;
      if (path && fallbackBike.current) {
        const point = path.getPointAtLength(pathLength * progress);
        fallbackBike.current.style.left = point.x + "%";
        fallbackBike.current.style.top = point.y + "%";
        const samples = Math.ceil(progress * 36);
        const travelledPoints = [];
        for (let index = 0; index <= samples && samples > 0; index++) {
          const sample = path.getPointAtLength(pathLength * progress * index / samples);
          travelledPoints.push(sample.x + "," + sample.y);
        }
        fallbackTravelled.current?.setAttribute("points", travelledPoints.join(" "));
      }
      courier.current?.setLngLat(origin ? [
        origin.lng + (current[0] - origin.lng) * t,
        origin.lat + (current[1] - origin.lat) * t,
      ] : current);
    };
    if (start === destination || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      draw(1);
      return;
    }
    const animate = (now: number) => {
      const t = Math.min(1, (now - started) / 750);
      draw(1 - Math.pow(1 - t, 3));
      if (t < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [current, step]);

  useEffect(() => {
    if (mapState !== "ready") return;
    const instance = map.current;
    (instance?.getSource("entrega-route") as GeoJSONSource | undefined)?.setData(routeFeature(routePoints));
    (instance?.getSource("entrega-travelled") as GeoJSONSource | undefined)?.setData(routeFeature(travelled));
  }, [routePoints, travelled, mapState]);

  return <div ref={scene} className="trip-map-canvas" data-map-state={mapState} data-at-destination={step === LAST_STEP}>
    <div className="trip-map-static" aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d={previewPath} className="trip-preview-outline" />
        <path ref={fallbackRoute} d={previewPath} className="trip-preview-remaining" />
        <polyline ref={fallbackTravelled} className="trip-preview-travelled" />
      </svg>
      <img ref={fallbackBike} className="trip-static-courier" src={SCOOTER_ICON} alt="" />
      <img className="trip-static-destination" src={DESTINATION_ICON} alt="" />
    </div>
    <div ref={container} className="trip-map-webgl" aria-label="Mapa interativo de Maringá" aria-hidden={mapState !== "ready"} />
    <div className="trip-map-overlay">
      <div ref={head} className="trip-map-overlay-head">{header}</div>
      <div className="trip-map-tools">
        {mapState === "fallback" && <span className="trip-map-fallback-notice" role="status">Prévia ilustrativa</span>}
        <div className="trip-map-zoom" role="group" aria-label="Controles de mapa">
          <button type="button" aria-label="Aproximar mapa" disabled={mapState !== "ready"} onClick={() => map.current?.zoomIn()}><Plus size={19} aria-hidden="true" /></button>
          <button type="button" aria-label="Afastar mapa" disabled={mapState !== "ready"} onClick={() => map.current?.zoomOut()}><Minus size={19} aria-hidden="true" /></button>
          {expanded && <button type="button" aria-label="Mostrar rota inteira" disabled={mapState !== "ready"}
            onClick={() => fitRoute(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 550)}><LocateFixed size={19} aria-hidden="true" /></button>}
        </div>
      </div>
      {footer && <div ref={sheet} className="trip-map-overlay-sheet">{footer}</div>}
    </div>
  </div>;
}

export default function DeliveryTrackingMap({ orderId, status, step, destinationLabel, children }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [directions, setDirections] = useState<Directions | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const dragStart = useRef<number | null>(null);
  const detailsId = useId();
  const stepIndex = status === "preparing" ? 0 : status === "on_route" ? Math.max(0, Math.min(LAST_STEP, step)) : LAST_STEP;
  const currentDirections = status === "on_route" && directions?.step === stepIndex ? directions : null;
  const points = currentDirections?.points;
  const routePoints = useMemo(() => points && stepIndex < LAST_STEP
    ? [...DEMO_PATH.slice(0, stepIndex + 1), ...points]
    : DEMO_PATH, [points, stepIndex]);
  const waze = wazeDirectionsUrl({ lat: DESTINATION[1], lng: DESTINATION[0] });
  const caption = statusLabels[status];

  useEffect(() => {
    if (status !== "on_route") return;
    const controller = new AbortController();
    async function loadRoadRoute() {
      try {
        const response = await fetch("/api/maps/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ demoStep: stepIndex }),
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json() as RouteResponse;
        if (controller.signal.aborted || !validLine(data.points)) return;
        setDirections({
          step: stepIndex, points: data.points,
          minutes: Number.isFinite(data.minutes) ? data.minutes : undefined,
          distanceKm: Number.isFinite(data.distanceKm) ? data.distanceKm : undefined,
        });
      } catch {
        // A simulated route remains visible if the directions provider is unavailable.
      }
    }
    void loadRoadRoute();
    return () => controller.abort();
  }, [status, stepIndex]);

  useEffect(() => {
    if (!expanded || !dialog.current) return;
    const modal = dialog.current;
    const opener = openButton.current;
    const previous = document.body.style.overflow;
    modal.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      modal.close();
      document.body.style.overflow = previous;
      opener?.focus({ preventScroll: true });
    };
  }, [expanded]);

  function closeMap() {
    setExpanded(false);
    setDetailsOpen(false);
  }

  return <>
    <section className="trip-tracking-module" aria-label="Mapa e progresso da entrega">
      <div className="trip-tracking-viewport">
        <MapCanvas step={stepIndex} routePoints={routePoints} header={
          <div className="trip-map-topbar">
            <span className="trip-map-chip"><Route size={17} aria-hidden="true" /> Trajeto simulado</span>
            <span className="trip-map-chip trip-tracking-city">Maringá</span>
            <button ref={openButton} type="button" className="trip-map-expand" aria-haspopup="dialog"
              aria-label="Ampliar mapa em tela cheia" onClick={() => setExpanded(true)}>
              <Expand size={19} aria-hidden="true" /><span>Ampliar</span>
            </button>
          </div>
        } />
      </div>
      <div className="trip-tracking-progress" data-status={status}>
        <div className="trip-tracking-status" aria-live="polite"><span className="trip-tracking-led" />{caption}</div>
        {children}
      </div>
    </section>
    {expanded && createPortal(
      <dialog ref={dialog} className="trip-map-fullscreen" aria-label="Acompanhamento do trajeto em tela cheia"
        onCancel={event => { event.preventDefault(); closeMap(); }}>
        <MapCanvas step={stepIndex} routePoints={routePoints} expanded header={
          <>
            <div className="trip-map-floating-head">
              <img src="/redesign/route-symbol.webp" width={42} height={42} alt="" />
              <div className="trip-map-title-copy">
                <strong>Pedido #{orderId}</strong>
                <span>{destinationLabel}</span>
              </div>
              <button type="button" className="trip-map-close" aria-label="Fechar mapa em tela cheia"
                onClick={closeMap} autoFocus><X size={23} aria-hidden="true" /></button>
            </div>
            <span className="trip-map-chip trip-map-simulation"><Route size={16} aria-hidden="true" /> Simulação</span>
          </>
        } footer={
          <section className="trip-map-bottom-sheet" data-status={status} aria-label="Progresso e navegação">
            <div className="trip-map-sheet-grip" aria-hidden="true"
              onPointerDown={event => {
                dragStart.current = event.clientY;
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerCancel={() => { dragStart.current = null; }}
              onPointerUp={event => {
                if (dragStart.current === null) return;
                const delta = event.clientY - dragStart.current;
                if (Math.abs(delta) > 26) setDetailsOpen(delta < 0);
                dragStart.current = null;
              }}>
              <span />
            </div>
            <div className="trip-map-sheet-title" aria-live="polite"><span className="trip-tracking-led" />{caption}</div>
            {children}
            <div className="trip-map-sheet-actions">
              <button type="button" className="trip-map-details-toggle" aria-expanded={detailsOpen} aria-controls={detailsId}
                onClick={() => setDetailsOpen(open => !open)}>
                {detailsOpen ? "Ocultar detalhes" : "Ver detalhes"} <ChevronDown size={17} aria-hidden="true" />
              </button>
              {waze && <a href={waze} target="_blank" rel="noopener noreferrer" className="trip-map-waze">
                Abrir no Waze <Navigation size={17} aria-hidden="true" />
              </a>}
            </div>
            <div id={detailsId} className="trip-map-details" data-open={detailsOpen} inert={!detailsOpen} aria-hidden={!detailsOpen}>
              <div className="trip-map-details-content">
                <dl className="trip-map-metrics">
                  <div><Clock3 size={18} aria-hidden="true" /><dt>Chegada estimada</dt><dd>{currentDirections?.minutes != null ? currentDirections.minutes + " min" : "—"}</dd></div>
                  <div><Route size={18} aria-hidden="true" /><dt>Distância restante</dt><dd>{currentDirections?.distanceKm != null ? currentDirections.distanceKm.toLocaleString("pt-BR") + " km" : "—"}</dd></div>
                </dl>
                {status === "on_route" && currentDirections?.minutes == null && <p>Estimativa indisponível para este trajeto.</p>}
                <p>Destino simulado em Maringá. Confira o endereço no Waze antes de navegar.</p>
              </div>
            </div>
          </section>
        } />
      </dialog>, document.body)}
  </>;
}
