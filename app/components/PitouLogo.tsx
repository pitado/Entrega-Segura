// Identidade do Pitou: um pino de localização (a entrega) com o ponto de chegada.
export function PitouMark({ size = 40 }: { size?: number }) {
  return <svg className="pitou-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <rect width="64" height="64" rx="18" fill="#141414" />
    <path d="M30 13.5c-8.6 0-15.5 6.7-15.5 15.1 0 10.6 12.4 21 13.9 22.3a2.4 2.4 0 0 0 3.2 0c1.5-1.3 13.9-11.7 13.9-22.3 0-8.4-6.9-15.1-15.5-15.1z" fill="#a4b7f7" />
    <circle cx="30" cy="28.6" r="6.2" fill="#141414" />
    <circle cx="47" cy="47" r="5.5" fill="#ffad51" />
  </svg>;
}

export default function PitouLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return <span className={`pitou-logo ${className}`.trim()} style={{ fontSize: Math.round(size * 0.62) }}>
    <PitouMark size={size} />
    <span className="pitou-wordmark">pitou</span>
  </span>;
}
