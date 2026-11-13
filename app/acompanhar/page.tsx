"use client";
import Link from "next/link";
import {useState} from "react";
import {ArrowRight,MapPin,Shield} from "lucide-react";
export default function TrackingEntry(){
 const [value,setValue]=useState(""),[error,setError]=useState("");
 const go=(e:React.FormEvent)=>{e.preventDefault();const id=value.trim().split("/").filter(Boolean).pop()||"";if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)){setError("Link inválido. Utilize o endereço enviado pelo estabelecimento.");return;}window.location.assign("/acompanhar/"+id);};
 return <div className="shell"><header className="topbar"><Link href="/" className="wordmark"><span className="wordmark-symbol">ES</span><span>Entrega Segura<small>Acompanhamento</small></span></Link><Link href="/" className="header-link">Voltar</Link></header><main className="single-content"><div className="single-icon"><MapPin size={26}/></div><span className="overline">ACOMPANHAMENTO DE PEDIDOS</span><h1>Onde está minha entrega?</h1><p>Abra o link recebido do estabelecimento para acompanhar o status e a localização compartilhada pelo entregador. Não é necessário instalar um aplicativo.</p><form className="entry-form" onSubmit={go}><label>Link de acompanhamento</label><input value={value} onChange={e=>setValue(e.target.value)} placeholder="Cole o link do pedido" required/><button className="button main-button">Acompanhar pedido <ArrowRight size={16}/></button>{error&&<p className="inline-error">{error}</p>}</form><div className="info-line"><Shield size={15}/><span>Somente pessoas com o link de acompanhamento podem consultar a entrega.</span></div><Link className="subtle-link" href="/demo">Ver viagem de demonstração</Link></main></div>;
}
