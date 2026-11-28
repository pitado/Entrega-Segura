// Identidade do Pitou: um "P" desenhado por uma linha contínua, como uma rota,
// que termina num ponto (o destino da entrega). Ao lado, o nome "pitou" em Sora.
// Arquivos oficiais (SVG e PNG) em public/brand/.

const ROUTE = "M40 -184H440A184 184 0 0 1 440 184H276A92 92 0 0 0 184 276V360A92 92 0 0 1 0 360V276A276 276 0 0 1 276 0H440";
const WORD = "M79 200V-543H189V-308.5L172.0 -309.5Q176 -393 206.5 -448.75Q237.0 -504.5 288.0 -532.25Q339 -560 402 -560Q459.5 -560.0 506.25 -538.75Q553.0 -517.5 586.5 -479.75Q620 -442 637.75 -391.5Q655.5 -341.0 655.5 -282.5V-261.5Q655.5 -203.0 638.0 -152.25Q620.5 -101.5 587.25 -63.25Q554 -25 507.0 -3.5Q460 18 401.5 18.0Q341 18 290.5 -7.25Q240.0 -32.5 208.75 -86.25Q177.5 -140.0 174.0 -224.5L218.0 -157.5V200ZM366.5 -99.0Q411.5 -99.0 445.25 -121.0Q479 -143 497.75 -182.25Q516.5 -221.5 516.5 -272.0Q516.5 -323.5 497.75 -361.75Q479 -400 445.5 -421.5Q412 -443 366.5 -443.0Q326 -443 291.25 -424.75Q256.5 -406.5 235.25 -371.75Q214 -337 214 -288V-248Q214 -201 236.0 -167.75Q258.0 -134.5 293.0 -116.75Q328 -99 366.5 -99.0ZM784.0 0V-543H923.0V0ZM708.0 -439V-543H923.0V-439ZM834.75 -608.0Q794.0 -608 774.5 -629.25Q755.0 -650.5 755.0 -683.5Q755.0 -716.5 774.5595238095239 -737.75Q794.1190476190476 -759.0 834.5 -759.0Q875.5 -759.0 894.75 -737.75Q914.0 -716.5 914.0 -683.5Q914.0 -650.5 894.75 -629.25Q875.5 -608.0 834.75 -608.0ZM1298.5 7.0Q1223.5 7.0 1175.0 -12.5Q1126.5 -32.0 1102.75 -78.25Q1079.0 -124.5 1079.0 -203.5L1079.5 -696.0H1209.5L1209.0 -195Q1209.0 -155 1230.5 -133.5Q1252.0 -112 1292.0 -112H1377.0V7ZM993.0 -441V-543H1377.0V-441ZM1734.5 19.0Q1663.0 19 1608.0 -4.0Q1553.0 -27 1515.0 -66.25Q1477.0 -105.5 1457.5 -155.5Q1438.0 -205.5 1438.0 -260V-281Q1438.0 -336.5 1458.25 -387.25Q1478.5 -438.0 1517.0 -477.25Q1555.5 -516.5 1610.5 -539.25Q1665.5 -562.0 1734.5 -562.0Q1804.0 -562 1858.75 -539.25Q1913.5 -516.5 1952.0 -477.25Q1990.5 -438.0 2010.75 -387.25Q2031.0 -336.5 2031.0 -281V-260Q2031.0 -205.5 2011.5 -155.5Q1992.0 -105.5 1954.0 -66.25Q1916.0 -27 1861.0 -4.0Q1806.0 19 1734.5 19.0ZM1734.5 -100.0Q1785.5 -100.0 1820.5 -122.25Q1855.5 -144.5 1873.75 -183.25Q1892.0 -222 1892.0 -270.5Q1892.0 -320.5 1873.25 -359.25Q1854.5 -398.0 1819.25 -420.5Q1784.0 -443 1734.5 -443.0Q1685.5 -443.0 1650.0 -420.5Q1614.5 -398.0 1595.75 -359.25Q1577.0 -320.5 1577.0 -270.5Q1577.0 -222 1595.25 -183.25Q1613.5 -144.5 1648.75 -122.25Q1684.0 -100 1734.5 -100.0ZM2318.0 17Q2223.5 17.0 2172.25 -44.75Q2121.0 -106.5 2121.0 -228.5V-543.5H2260.0V-216.5Q2260.0 -166.5 2288.0 -137.25Q2316.0 -108 2363.5 -108.0Q2412.0 -108 2442.5 -138.75Q2473.0 -169.5 2473.0 -222.5V-543.5H2612.0V0H2502.0V-230.5H2513.0Q2513.0 -148.5 2491.75 -93.5Q2470.5 -38.5 2428.75 -10.75Q2387.0 17 2324.0 17Z";

function Route({ color, width = 100, dot = 66 }: { color: string; width?: number; dot?: number }) {
  return <>
    <path d={ROUTE} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="440" cy="0" r={dot} fill={color} />
  </>;
}

/** Ícone quadrado (fundo escuro, rota em verde-limão), para onde só cabe um ícone. */
export function PitouMark({ size = 40 }: { size?: number }) {
  return <svg className="pitou-mark" width={size} height={size} viewBox="-316 -494 1256 1256" aria-hidden="true" focusable="false">
    <rect x="-316" y="-494" width="1256" height="1256" rx="282" fill="var(--p-bg, #080A10)" />
    <Route color="var(--p-lime, #C3EA5C)" />
  </svg>;
}

/** Logo completa: símbolo + "pitou". O nome usa a cor do texto (currentColor). */
export default function PitouLogo({ size = 40, className = "", symbolOnly = true }: { size?: number; className?: string; symbolOnly?: boolean }) {
  const h = Math.round(size * 0.82);
  return <span className={`pitou-logo ${className}`.trim()}>
    <svg className="pitou-lockup" height={h} width={Math.round(h * (symbolOnly ? 724 : 2257) / 778)} viewBox={symbolOnly ? "-50 -276 724 778" : "-50 -276 2257 778"} role="img" aria-label="Pitou">
      <Route color="var(--p-lime, #C3EA5C)" />
      {!symbolOnly && <path transform="translate(739.6 150) scale(0.5618)" d={WORD} fill="currentColor" />}
    </svg>
  </span>;
}
