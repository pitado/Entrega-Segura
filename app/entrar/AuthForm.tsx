"use client";

import { useEffect, useState, type FormEvent } from "react";
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
    <div className="pt-auth-card">
      <a href="/" aria-label="Pitou, página inicial" style={{ justifySelf: "center", textDecoration: "none" }}><PitouLogo size={44} /></a>
      <div className="pt-card pt-stack">
        <div className="pt-seg" role="group" aria-label="Escolha">
          <button type="button" aria-pressed={mode === "login"} onClick={() => { setMode("login"); setError(""); }}>Entrar</button>
          <button type="button" aria-pressed={mode === "signup"} onClick={() => { setMode("signup"); setError(""); }}>Criar conta</button>
        </div>
        <div>
          <h1>{mode === "login" ? "Painel do estabelecimento" : "Comece a usar o Pitou"}</h1>
          <p className="pt-muted" style={{ marginTop: 6 }}>
            {mode === "login" ? "Entre com o e-mail e a senha da sua conta." : `Plano único de R$ ${pricing.base}/mês com até ${pricing.includedCouriers} entregadores. Sem fidelidade.`}
          </p>
        </div>
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
      </div>
      <p className="pt-muted pt-small" style={{ textAlign: "center" }}><a href="/">Voltar para a página inicial</a> · <a href="/demo">Ver demonstração</a></p>
    </div>
  </main>;
}
