import type {SVGProps} from "react";
type Variant="courier"|"parcel"|"tracking";
/** Ilustrações 2D originais em SVG, leves e escaláveis. */
export function EditorialArt({variant="courier",...props}:{variant?:Variant}&SVGProps<SVGSVGElement>){
return <svg viewBox="0 0 320 230" fill="none" role="img" aria-label={variant==="courier"?"Ilustração plana de entregador de moto":variant==="parcel"?"Ilustração plana de encomendas":"Ilustração plana de percurso"} {...props}>
 <path d="M25 190h270" stroke="#131313" strokeWidth="2.5" strokeLinecap="round"/>
 <path d="M19 53h20m-10-10v20M266 44l7-17 7 17 17 7-17 7-7 17-7-17-17-7 17-7z" stroke="#131313" strokeWidth="2" fill="#fff"/>
 {variant==="courier"?<>
 <circle cx="79" cy="179" r="33" fill="#fff" stroke="#111" strokeWidth="4"/><circle cx="79" cy="179" r="11" fill="#9DB9FA" stroke="#111" strokeWidth="3"/>
 <circle cx="246" cy="179" r="33" fill="#fff" stroke="#111" strokeWidth="4"/><circle cx="246" cy="179" r="11" fill="#9DB9FA" stroke="#111" strokeWidth="3"/>
 <path d="M79 178l43-63h55l69 63M123 115l36 63h-80M160 178l25-65h34" stroke="#111" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
 <path d="M127 132h74l-16 30h-46z" fill="#FF963B" stroke="#111" strokeWidth="3"/>
 <rect x="67" y="82" width="53" height="55" rx="9" fill="#E69AF3" stroke="#111" strokeWidth="3.5"/>
 <path d="M77 96h31m-31 11h20" stroke="#111" strokeWidth="2" strokeLinecap="round"/>
 <path d="M145 100l-12 37 47 8 18-39" fill="#111" stroke="#111" strokeWidth="3" strokeLinejoin="round"/>
 <path d="M175 143l26 34m-51-35l-22 33" stroke="#111" strokeWidth="5" strokeLinecap="round"/>
 <path d="M161 109l35-16 24 21" stroke="#111" strokeWidth="5" strokeLinecap="round"/>
 <circle cx="181" cy="69" r="25" fill="#FFE5CD" stroke="#111" strokeWidth="3.5"/>
 <path d="M152 64c-1-22 13-40 32-40 21 0 37 15 36 40h-68z" fill="#9DB9FA" stroke="#111" strokeWidth="3.5"/>
 <path d="M149 64h75" stroke="#111" strokeWidth="4" strokeLinecap="round"/>
 <path d="M191 70h3" stroke="#111" strokeWidth="3.5" strokeLinecap="round"/>
 <path d="M195 83q-7 6-14 0" stroke="#111" strokeWidth="2" strokeLinecap="round"/>
 <path d="M255 93c0-17 26-17 26 0 0 11-13 24-13 24s-13-13-13-24z" fill="#FF963B" stroke="#111" strokeWidth="3"/><circle cx="268" cy="93" r="4" fill="#fff"/>
 </>:variant==="parcel"?<>
 <rect x="51" y="91" width="128" height="108" rx="13" fill="#FF963B" stroke="#111" strokeWidth="4"/>
 <path d="M51 115l62 40 66-40" stroke="#111" strokeWidth="4"/><path d="M115 155v44" stroke="#111" strokeWidth="4"/>
 <rect x="88" y="63" width="92" height="62" rx="9" fill="#BDEACD" stroke="#111" strokeWidth="4"/>
 <path d="M88 79l47 30 45-30m-45 30v16" stroke="#111" strokeWidth="3"/>
 <rect x="175" y="119" width="100" height="80" rx="11" fill="#E69AF3" stroke="#111" strokeWidth="4"/>
 <path d="M175 134l50 31 50-31m-50 31v34" stroke="#111" strokeWidth="3"/>
 <path d="M40 136l-8 12m16-2l-8 11m184-95l8-16m-23 9l10-16" stroke="#111" strokeWidth="3" strokeLinecap="round"/>
 </>:<>
 <rect x="38" y="54" width="240" height="143" rx="25" fill="#F4F5FC" stroke="#111" strokeWidth="3"/>
 <path d="M40 103h236M115 55v142M205 55v142" stroke="#fff" strokeWidth="18"/>
 <path d="M66 168c0-49 29-44 59-44h40c35 0 18-45 63-45" stroke="#9DB9FA" strokeWidth="10" strokeLinecap="round" strokeDasharray="7 5"/>
 <circle cx="66" cy="168" r="14" fill="#FF963B" stroke="#111" strokeWidth="3"/><circle cx="227" cy="79" r="17" fill="#111"/><circle cx="227" cy="79" r="6" fill="#fff"/>
 <circle cx="170" cy="113" r="12" fill="#E69AF3" stroke="#111" strokeWidth="3"/>
 </>}
 </svg>
}
