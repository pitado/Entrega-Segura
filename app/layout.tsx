import "./style.css";
import type {Metadata} from "next";
export const metadata:Metadata={
 title:{default:"Entrega Segura",template:"%s | Entrega Segura"},
 description:"Gestão de entregas, painel de estabelecimento e acompanhamento compartilhado.",
 robots:{index:false,follow:false},
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>;}
