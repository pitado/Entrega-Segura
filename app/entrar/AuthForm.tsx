"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, ShieldCheck } from "lucide-react";
import Art from "../components/Art";
import PitouLogo from "../components/PitouLogo";
import { api } from "../components/client";
import { pricing } from "../pricing";

type Mode = "login" | "signup";

export default function AuthForm({ initialMode }: { initialMode: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [inviteRequired, setInviteRequired] = useState(false);

  useEffect(() => {
    api<{ user?: unknown }>("/api/auth/me").then(() => location.replace("/painel")).catch(() => {});
    api<{ inviteRequired: boolean }>("/api/auth/signup").then(r => setInviteRequired(r.inviteRequired)).catch(() => {});
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(mode === "login" ? "/api/auth/login" : "/api/auth/signup", { body: data });
      location.assign("/painel");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return <main className="pt pt-auth">
    <div className="pt-auth-side">
      <a className="pt-auth-brand" href="/" aria-label="Pitou, página inicial"><PitouLogo size={40} symbolOnly /></a>
      <div className="pt-auth-center"><div className="pt-auth-card">
        <div className="pt-seg" role="group" aria-label="Escolha">
          <button type="button" aria-pressed={mode === "login"} onClick={() => { setMode("login"); setError(""); }}>Entrar</button>
          <button type="button" aria-pressed={mode === "signup"} onClick={() => { setMode("signup"); setError(""); }}>Criar conta</button>
        </div>
        <div>
          <h1>{mode === "login" ? "Entre na sua conta" : "Comece a usar o Pitou"}</h1>
          <p className="pt-muted" style={{ marginTop: 10, fontSize: 17 }}>
            {mode === "login" ? "Acompanhe pedidos e entregadores no painel do seu estabelecimento." : `Plano único de R$ ${pricing.base}/mês com até ${pricing.includedCouriers} entregadores. Sem fidelidade.`}
          </p>
        </div>
        {mode === "signup" && <div className="pt-hero-card pt-plan-mini" aria-hidden="true">
          <span className="pt-hero-kicker">Plano único</span>
          <h1>R$ {pricing.base}<small style={{ fontSize: 15, letterSpacing: 0 }}>/mês</small></h1>
          <small>até {pricing.includedCouriers} entregadores, sem fidelidade</small>
          <Art name="moto" label={false} />
        </div>}
        <form className="pt-stack" onSubmit={submit} key={mode}>
          {mode === "signup" && <>
            <label className="pt-field"><span>Seu nome</span><input name="name" required minLength={2} maxLength={80} autoComplete="name" /></label>
            <label className="pt-field"><span>Nome do estabelecimento</span><input name="restaurant" required minLength={2} maxLength={90} autoComplete="organization" /></label>
            <label className="pt-field"><span>Telefone / WhatsApp</span><input name="phone" inputMode="tel" autoComplete="tel" placeholder="(44) 99999-0000" /></label>
          </>}
          <label className="pt-field"><span>E-mail</span><input name="email" type="email" required autoComplete="email" maxLength={160} /></label>
          <label className="pt-field"><span>Senha</span><input name="password" type="password" required minLength={mode === "signup" ? 8 : 1} autoComplete={mode === "login" ? "current-password" : "new-password"} />
            {mode === "signup" && <small className="pt-muted" style={{ fontWeight: 450 }}>Pelo menos 8 caracteres.</small>}
          </label>
          {mode === "signup" && inviteRequired && <label className="pt-field"><span>Código de convite</span><input name="invite" required autoComplete="off" /></label>}
          {error && <p className="pt-error" role="alert">{error}</p>}
          <button className="pt-btn pt-btn-block" disabled={busy}>{busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}</button>
        </form>
        <p className="pt-auth-links"><a href="/demo">Ver demonstração</a><a href="/">Voltar para a página inicial</a></p>
      </div></div>
    </div>
    <aside className="pt-auth-art" aria-label="Sobre o Pitou">
      <svg className="pt-auth-rings" viewBox="0 0 700 868" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="none" stroke="#0B1208" strokeOpacity=".09" strokeWidth="2"><circle cx="480" cy="640" r="170" /><circle cx="480" cy="640" r="290" /><circle cx="480" cy="640" r="410" /></g></svg>
      <div className="pt-auth-art-copy">
        <h2>Suas entregas sob controle, do pedido à porta do cliente.</h2>
        <ul>
          {["Entregadores e pedidos em um só painel", "Cliente acompanha sem instalar aplicativo", "Cashback que traz o cliente de volta"].map(item => <li key={item}><span><Check size={14} strokeWidth={3} /></span>{item}</li>)}
        </ul>
      </div>
      <div className="pt-auth-float"><i><ShieldCheck size={20} aria-hidden="true" /></i><b>Entrega acompanhada</b><small>Ao vivo, do preparo à porta</small></div>
      <Art name="moto" />
      <Art name="box" />
    </aside>
  </main>;
}
