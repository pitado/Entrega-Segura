// Mapa de chegada do Encontro: um mapinha 2D no estilo Pitou. O centro é o destino e o
// entregador vem pela rua até ele, numa linha de rota igual à do "P" da logo.
// A escala se ajusta à distância para o entregador ficar sempre dentro do quadro.

const scales = [[10, 30, 60], [50, 150, 300], [250, 500, 1000], [1000, 2000, 4000]];

export function distanceText(m: number | null | undefined): string {
  if (m == null) return "";
  if (m < 30) return "menos de 30 m";
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

const W = 460, H = 320, CX = 230, CY = 168;
const fixedCols = [52, 141, 319, 408];
const fixedRows = [44, 292];

function pill(x: number, y: number, text: string, tone: "dark" | "lime" = "dark") {
  const w = Math.round(text.length * 9.6 + 30);
  const left = Math.min(Math.max(x - w / 2, 10), W - w - 10);
  return <g>
    <rect x={left} y={y - 17} width={w} height={34} rx={17}
      fill={tone === "lime" ? "#C3EA5C" : "#080A10"} fillOpacity={tone === "lime" ? 1 : .92}
      stroke={tone === "lime" ? "none" : "#fff"} strokeOpacity=".12" />
    <text x={left + w / 2} y={y + 6} textAnchor="middle" fontSize="16" fontWeight="700"
      fill={tone === "lime" ? "#0B1208" : "#F3F5FA"}>{text}</text>
  </g>;
}

export default function Radar({ distance, centerLabel = "Você", dotLabel, bearing = 235 }: {
  distance: number | null; centerLabel?: string; dotLabel: string; bearing?: number;
}) {
  const d = distance == null ? null : Math.max(0, distance);
  const rings = scales.find(s => d == null || d <= s[2]) || scales[scales.length - 1];
  const radii = [58, 104, 150];
  // Distância do entregador até o centro, interpolada entre os anéis para ficar legível.
  let r = 150;
  if (d != null) {
    if (d <= rings[0]) r = 26 + (d / rings[0]) * (radii[0] - 26);
    else if (d <= rings[1]) r = radii[0] + ((d - rings[0]) / (rings[1] - rings[0])) * (radii[1] - radii[0]);
    else r = radii[1] + ((Math.min(d, rings[2]) - rings[1]) / (rings[2] - rings[1])) * (radii[2] - radii[1]);
  }
  const angle = (bearing - 90) * Math.PI / 180;
  const x = Math.round(CX + Math.cos(angle) * r * 1.15), y = Math.round(CY + Math.sin(angle) * r * .78);

  // Rota pelas ruas: primeiro na rua do entregador até a rua do destino, depois até a porta.
  const sx = Math.sign(CX - x), sy = Math.sign(CY - y);
  const corner = Math.min(22, Math.abs(CX - x), Math.abs(CY - y));
  const route = `M${x} ${y} L${CX - sx * corner} ${y} Q${CX} ${y} ${CX} ${y + sy * corner} L${CX} ${CY}`;
  const heading = Math.abs(CX - x) > 4 ? (sx > 0 ? 90 : -90) : (sy > 0 ? 180 : 0);

  // Ruas: uma grade fixa e as duas ruas que a rota usa.
  const cols = [...fixedCols.filter(c => Math.abs(c - CX) > 34 && Math.abs(c - x) > 34), CX, x];
  const rows = [...fixedRows.filter(v => Math.abs(v - CY) > 34 && Math.abs(v - y) > 34), CY, y];

  const label = d == null ? `${dotLabel} a caminho` : `${dotLabel} está a ${distanceText(d)}`;
  // Nome do entregador do lado de fora da rota, sem sair do quadro.
  const below = y > CY ? y + 48 <= H - 22 : y - 46 < 22;
  const courierLabelY = below ? y + 48 : y - 46;
  const centerLabelY = y > CY ? CY - 44 : CY + 46;

  return <svg className="pt-radar" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Mapa de chegada: ${label}`} fontFamily="var(--p-body)">
    <style>{`
      .pt-radar{border-radius:24px}
      .pt-radar .pt-radar-pulse{transform-origin:center;transform-box:fill-box;animation:pt-radar-pulse 2.4s ease-out infinite}
      .pt-radar .pt-radar-flow{animation:pt-radar-flow 1.1s linear infinite}
      @keyframes pt-radar-pulse{from{transform:scale(1);opacity:.7}to{transform:scale(3.4);opacity:0}}
      @keyframes pt-radar-flow{to{stroke-dashoffset:-24}}
      @media (prefers-reduced-motion:reduce){.pt-radar .pt-radar-pulse,.pt-radar .pt-radar-flow{animation:none}.pt-radar .pt-radar-pulse{opacity:0}}
    `}</style>
    <defs>
      <clipPath id="pt-radar-clip"><rect width={W} height={H} rx="24" /></clipPath>
      <radialGradient id="pt-radar-glow" cx={CX / W} cy={CY / H} r=".55">
        <stop offset="0" stopColor="#C3EA5C" stopOpacity=".16" />
        <stop offset="1" stopColor="#C3EA5C" stopOpacity="0" />
      </radialGradient>
    </defs>
    <g clipPath="url(#pt-radar-clip)">
      {/* Quarteirões */}
      <rect width={W} height={H} fill="#11151E" />
      <rect x="352" y="196" width="140" height="150" rx="18" fill="#C3EA5C" fillOpacity=".07" />
      <rect x="-30" y="-30" width="110" height="96" rx="18" fill="#FFD25A" fillOpacity=".05" />
      {/* Ruas */}
      <g stroke="#1C2230" strokeLinecap="round">
        {cols.map((c, i) => <line key={"c" + i} x1={c} y1={-20} x2={c} y2={H + 20} strokeWidth={c === CX || c === x ? 18 : 12} />)}
        {rows.map((v, i) => <line key={"r" + i} x1={-20} y1={v} x2={W + 20} y2={v} strokeWidth={v === CY || v === y ? 18 : 12} />)}
      </g>
      <rect width={W} height={H} fill="url(#pt-radar-glow)" />
      {/* Zona de entrega */}
      <circle cx={CX} cy={CY} r={radii[0]} fill="#C3EA5C" fillOpacity=".08" stroke="#C3EA5C" strokeOpacity=".55" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" />
      <circle className="pt-radar-pulse" cx={CX} cy={CY} r="16" fill="none" stroke="#C3EA5C" strokeWidth="2.5" />
      {/* Rota */}
      {d != null && <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={route} stroke="#080A10" strokeWidth="16" strokeOpacity=".7" />
        <path d={route} stroke="#C3EA5C" strokeWidth="9" />
        <path className="pt-radar-flow" d={route} stroke="#0B1208" strokeOpacity=".35" strokeWidth="3" strokeDasharray="0.1 12" />
      </g>}
      {/* Destino: o ponto final da rota, como na logo */}
      <circle cx={CX} cy={CY} r="17" fill="#080A10" stroke="#C3EA5C" strokeWidth="4.5" />
      <circle cx={CX} cy={CY} r="7" fill="#C3EA5C" />
      {pill(CX, centerLabelY, centerLabel)}
      {/* Entregador */}
      <g transform={`translate(${x} ${y})`}>
        <circle r="28" fill="#C3EA5C" fillOpacity=".18" />
        <circle r="19" fill="#C3EA5C" stroke="#080A10" strokeWidth="3" />
        <path d="M0 -9 L8 8 L0 4 L-8 8 Z" fill="#0B1208" strokeLinejoin="round" transform={`rotate(${heading})`} />
      </g>
      {pill(x, courierLabelY, dotLabel, "lime")}
    </g>
    <rect x=".5" y=".5" width={W - 1} height={H - 1} rx="23.5" fill="none" stroke="#fff" strokeOpacity=".08" />
  </svg>;
}

/** Direção (graus a partir do norte) de `from` para `to`. */
export function bearingDeg(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const y = Math.sin((to.lng - from.lng) * rad) * Math.cos(to.lat * rad);
  const x = Math.cos(from.lat * rad) * Math.sin(to.lat * rad) - Math.sin(from.lat * rad) * Math.cos(to.lat * rad) * Math.cos((to.lng - from.lng) * rad);
  return (Math.atan2(y, x) / rad + 360) % 360;
}
