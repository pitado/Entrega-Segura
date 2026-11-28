// Identidade do Pitou: o nome em Sora é a marca. O selo "P" em verde-limão
// aparece onde só cabe um ícone (aba do navegador, demonstração no celular).
export function PitouMark({ size = 40 }: { size?: number }) {
  return <span className="pitou-mark" style={{ width: size, height: size, fontSize: Math.round(size * 0.6), borderRadius: Math.round(size * 0.3) }} aria-hidden="true">P</span>;
}

export default function PitouLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return <span className={`pitou-logo ${className}`.trim()} style={{ fontSize: Math.round(size * 0.72) }}>
    <span className="pitou-wordmark">Pitou</span>
  </span>;
}
