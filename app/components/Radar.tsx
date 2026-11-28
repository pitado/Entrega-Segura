// Radar de proximidade do Encontro: o centro é o destino e o ponto é o entregador.
// A escala dos anéis se ajusta à distância para o ponto ficar sempre dentro do radar.

const scales = [[10, 30, 60], [50, 150, 300], [250, 500, 1000], [1000, 2000, 4000]];

export function distanceText(m: number | null | undefined): string {
  if (m == null) return "";
  if (m < 30) return "menos de 30 m";
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

export default function Radar({ distance, centerLabel = "Você", dotLabel, bearing = 235 }: {
  distance: number | null; centerLabel?: string; dotLabel: string; bearing?: number;
}) {
  const d = distance == null ? null : Math.max(0, distance);
  const rings = scales.find(s => d == null || d <= s[2]) || scales[scales.length - 1];
  const radii = [60, 105, 150];
  // Posição do entregador: interpola entre os anéis para a distância ficar legível.
  let r = 150;
  if (d != null) {
    if (d <= rings[0]) r = 18 + (d / rings[0]) * (radii[0] - 18);
    else if (d <= rings[1]) r = radii[0] + ((d - rings[0]) / (rings[1] - rings[0])) * (radii[1] - radii[0]);
    else r = radii[1] + ((Math.min(d, rings[2]) - rings[1]) / (rings[2] - rings[1])) * (radii[2] - radii[1]);
  }
  const angle = (bearing - 90) * Math.PI / 180;
  const x = 230 + Math.cos(angle) * r, y = 160 + Math.sin(angle) * r * 0.82;
  const ux = (230 - x) / Math.hypot(230 - x, 160 - y || 1), uy = (160 - y) / Math.hypot(230 - x, 160 - y || 1);
  const fmt = (m: number) => m >= 1000 ? `${m / 1000} km` : `${m} m`;
  const label = d == null ? `${dotLabel} a caminho` : `${dotLabel} está a ${distanceText(d)}`;

  return <svg className="pt-radar" viewBox="0 0 460 320" role="img" aria-label={`Radar de proximidade: ${label}`} fontFamily="var(--p-body)">
    <circle cx="230" cy="160" r={radii[2]} fill="none" stroke="#fff" strokeOpacity=".06" strokeWidth="2" />
    <circle cx="230" cy="160" r={radii[1]} fill="none" stroke="#fff" strokeOpacity=".11" strokeWidth="2" />
    <circle cx="230" cy="160" r={radii[0]} fill="#C3EA5C" fillOpacity=".16" stroke="#C3EA5C" strokeOpacity=".7" strokeWidth="2" />
    <text x="230" y="24" textAnchor="middle" fontSize="14" fontWeight="600" fill="#8A94AD">{fmt(rings[2])}</text>
    <text x="230" y="69" textAnchor="middle" fontSize="14" fontWeight="600" fill="#8A94AD">{fmt(rings[1])}</text>
    <text x="230" y="114" textAnchor="middle" fontSize="14" fontWeight="700" fill="#C3EA5C">{fmt(rings[0])}</text>
    <circle className="pt-radar-pulse" cx="230" cy="160" r="12" fill="none" stroke="#C3EA5C" strokeWidth="2.5" />
    {d != null && <line x1={x + ux * 20} y1={y + uy * 20} x2={230 - ux * 14} y2={160 - uy * 14} stroke="#C3EA5C" strokeWidth="4" strokeLinecap="round" strokeDasharray="0.1 10" />}
    <circle cx="230" cy="160" r="11" fill="#C3EA5C" stroke="#fff" strokeWidth="4" />
    <text x="230" y="198" textAnchor="middle" fontSize="15" fontWeight="700" fill="#F3F5FA">{centerLabel}</text>
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
      <circle r="25" fill="#C3EA5C" fillOpacity=".22" />
      <circle r="18" fill="#fff" />
      <polygon points="0,-9 8,8 0,4 -8,8" fill="#0B1208" transform={`rotate(${(Math.atan2(uy, ux) * 180 / Math.PI + 90).toFixed(0)})`} />
    </g>
    <text x={x.toFixed(1)} y={(y + 42).toFixed(1)} textAnchor="middle" fontSize="15" fontWeight="700" fill="#F3F5FA">{dotLabel}</text>
  </svg>;
}

/** Direção (graus a partir do norte) de `from` para `to`. */
export function bearingDeg(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const y = Math.sin((to.lng - from.lng) * rad) * Math.cos(to.lat * rad);
  const x = Math.cos(from.lat * rad) * Math.sin(to.lat * rad) - Math.sin(from.lat * rad) * Math.cos(to.lat * rad) * Math.cos((to.lng - from.lng) * rad);
  return (Math.atan2(y, x) / rad + 360) % 360;
}
