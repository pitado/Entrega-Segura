// Ilustrações da identidade Pitou.
// SVGs estáticos, sem dados do usuário.

const art = {
  // Ilustrações 2D desenhadas pelo miguel (arquivos em public/art).
  moto: "<svg viewBox=\"0 0 960 726\"><image href=\"/art/entregador-moto.webp\" width=\"960\" height=\"726\"/></svg>",
  box: "<svg viewBox=\"0 0 372 232\"><image href=\"/art/entregador-caixa.svg\" width=\"372\" height=\"232\"/></svg>",
  burger: "<svg viewBox=\"0 0 140 120\"><ellipse cx=\"70\" cy=\"112\" rx=\"52\" ry=\"6\" fill=\"#000\" fill-opacity=\".28\"/><path d=\"M22 56C22 26 44 12 70 12S118 26 118 56Z\" fill=\"#E8A33D\"/><ellipse cx=\"46\" cy=\"30\" rx=\"4.5\" ry=\"2.2\" fill=\"#FFF1C9\" transform=\"rotate(0 46 30)\"/><ellipse cx=\"66\" cy=\"22\" rx=\"4.5\" ry=\"2.2\" fill=\"#FFF1C9\" transform=\"rotate(20 66 22)\"/><ellipse cx=\"88\" cy=\"30\" rx=\"4.5\" ry=\"2.2\" fill=\"#FFF1C9\" transform=\"rotate(-15 88 30)\"/><ellipse cx=\"58\" cy=\"42\" rx=\"4.5\" ry=\"2.2\" fill=\"#FFF1C9\" transform=\"rotate(10 58 42)\"/><ellipse cx=\"80\" cy=\"44\" rx=\"4.5\" ry=\"2.2\" fill=\"#FFF1C9\" transform=\"rotate(-10 80 44)\"/><path d=\"M18 58q8 10 16 0t16 0 16 0 16 0 16 0 16 0 6 4v6H18z\" fill=\"#8FB02E\"/><path d=\"M20 68H120L112 82H28Z\" fill=\"#FFD25A\"/><rect x=\"18\" y=\"76\" width=\"104\" height=\"16\" rx=\"8\" fill=\"#5A3420\"/><path d=\"M26 96H114Q114 108 100 108H40Q26 108 26 96Z\" fill=\"#E8A33D\"/></svg>",
  juice: "<svg viewBox=\"0 0 90 118\"><ellipse cx=\"45\" cy=\"112\" rx=\"30\" ry=\"5\" fill=\"#000\" fill-opacity=\".28\"/><path d=\"M60 12L66 2\" stroke=\"#FF8A7A\" stroke-width=\"5\" stroke-linecap=\"round\"/><path d=\"M55 30L60 12\" stroke=\"#FF8A7A\" stroke-width=\"5\" stroke-linecap=\"round\"/><rect x=\"18\" y=\"26\" width=\"54\" height=\"9\" rx=\"4.5\" fill=\"#F4F7EC\"/><path d=\"M22 35H68L62 106Q61 110 57 110H33Q29 110 28 106Z\" fill=\"#FFB84D\" fill-opacity=\".92\"/><path d=\"M22 35H68L66 54H24Z\" fill=\"#FFC96E\"/><path d=\"M25 70H65L63.5 90H26.5Z\" fill=\"#F4F7EC\"/><circle cx=\"45\" cy=\"80\" r=\"6.5\" fill=\"#C3EA5C\"/></svg>",
  fries: "<svg viewBox=\"0 0 100 118\"><ellipse cx=\"50\" cy=\"112\" rx=\"34\" ry=\"5\" fill=\"#000\" fill-opacity=\".28\"/><rect x=\"24\" y=\"18\" width=\"9\" height=\"52\" rx=\"4\" fill=\"#FFD25A\" transform=\"rotate(-10 28 70)\"/><rect x=\"36\" y=\"8\" width=\"9\" height=\"60\" rx=\"4\" fill=\"#FFD25A\" transform=\"rotate(-4 40 68)\"/><rect x=\"48\" y=\"4\" width=\"9\" height=\"64\" rx=\"4\" fill=\"#FFD25A\" transform=\"rotate(2 52 68)\"/><rect x=\"60\" y=\"10\" width=\"9\" height=\"58\" rx=\"4\" fill=\"#FFD25A\" transform=\"rotate(6 64 68)\"/><rect x=\"72\" y=\"20\" width=\"9\" height=\"50\" rx=\"4\" fill=\"#FFD25A\" transform=\"rotate(12 76 70)\"/><path d=\"M20 52H80L72 108Q71 112 67 112H33Q29 112 28 108Z\" fill=\"#FF8A7A\"/><path d=\"M20 52H80L78 64H22Z\" fill=\"#E26A5A\"/><circle cx=\"50\" cy=\"84\" r=\"10\" fill=\"#FFD25A\"/><path d=\"M45 84l4 4 7-8\" fill=\"none\" stroke=\"#151A26\" stroke-width=\"3.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
} as const;

export type ArtName = keyof typeof art;

const labels: Record<ArtName, string> = {
  // Ilustrações 2D desenhadas pelo miguel (arquivos em public/art).
  moto: "<svg viewBox=\"0 0 960 726\"><image href=\"/art/entregador-moto.webp\" width=\"960\" height=\"726\"/></svg>",
  box: "<svg viewBox=\"0 0 372 232\"><image href=\"/art/entregador-caixa.svg\" width=\"372\" height=\"232\"/></svg>",
  burger: "Hambúrguer",
  juice: "Suco",
  fries: "Batata frita",
};

/** Ilustração da marca. Sem `label`, é decorativa (oculta para leitores de tela). */
export default function Art({ name, className = "", label }: { name: ArtName; className?: string; label?: string | false }) {
  const text = label === undefined ? labels[name] : label;
  return <span className={`pt-art pt-art-${name} ${className}`.trim()}
    {...(text ? { role: "img", "aria-label": text } : { "aria-hidden": true })}
    dangerouslySetInnerHTML={{ __html: art[name] }} />;
}
