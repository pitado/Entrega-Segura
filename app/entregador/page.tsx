"use client";
import Link from "next/link";
import {useState} from "react";
import {ArrowRight,Truck,Shield} from "lucide-react";
export default function CourierEntry(){
 const [value,setValue]=useState("");
 const [error,setError]=useState("");
 const go=(e:React.FormEvent)=>{e.preventDefault();
   const last=value.trim().split("/").filter(Boolean).pop()||"";
   if(!/^[a-f0-9]{64}$/.test(last)){setError("Cole o link completo fornecido pelo estabelecimento.");return;}
   window.location.assign("/entregador/"+last);
 };
 return <div className="shell"><header className="topbar"><Link href="/" className="wordmark"><span>Entrega Segura</span></Link><Link href="/" className="header-link">Voltar</Link></header><main className="single-content"><h1>Minhas entregas</h1><p>Abra o link pessoal que o estabelecimento enviou para acessar sua fila, atualizar pedidos e compartilhar a localização quando estiver em rota.</p><form onSubmit={go} className="entry-form"><label>Link de acesso</label><input value={value} onChange={e=>setValue(e.target.value)} placeholder="Cole aqui o link recebido" required/><button type="submit" className="button main-button">Abrir minhas entregas <ArrowRight size={16}/></button>{error&&<span className="inline-error">{error}</span>}</form><div className="info-line"><Shield size={16}/><span>Seu acesso é individual. Não compartilhe o link com terceiros.</span></div><Link className="subtle-link" href="/demo">Experimentar viagem simulada</Link></main></div>;
}
