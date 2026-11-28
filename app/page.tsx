import type { Metadata } from "next";
import {
  ArrowRight, BellRing, Bike, Check, ClipboardList, Gift, History, MapPin, MenuSquare, Route, ShieldCheck, Store,
} from "lucide-react";
import PriceSimulator from "./PriceSimulator";
import { pricing } from "./pricing";
import "./landing.css";

const description = "Gestão e acompanhamento das entregas do seu estabelecimento em tempo real, com entregadores próprios, histórico e cashback para fidelizar clientes.";

export const metadata: Metadata = {
  title: { absolute: "Pitou · Entregas seguras para o seu estabelecimento" },
  description,
};

const money = (value: number) => value.toLocaleString("pt-BR", { minimumFractionDigits: value % 1 ? 2 : 0, maximumFractionDigits: 2 });

const features = [
  { icon: Bike, title: "Seus entregadores", text: `Cadastre a sua equipe de entrega. O plano já inclui até ${pricing.includedCouriers} entregadores.`, tone: "blue" },
  { icon: Route, title: "Tempo real", text: "Veja onde cada entrega está agora, do preparo até a porta do cliente.", tone: "orange" },
  { icon: History, title: "Histórico completo", text: "Consulte entregas passadas, quem levou e quando cada pedido foi concluído.", tone: "lilac" },
  { icon: Gift, title: "Cashback", text: "Devolva parte do valor como crédito e incentive o cliente a comprar de novo.", tone: "green" },
];

const steps = [
  { icon: Store, who: "Estabelecimento", text: "Cria o pedido e escolhe o entregador." },
  { icon: Bike, who: "Entregador", text: "Recebe o link, sai com o pedido e compartilha a rota." },
  { icon: MapPin, who: "Cliente", text: "Acompanha o trajeto pelo celular e avisa quando está pronto para receber." },
];

const included = [
  "Acesso completo à plataforma",
  `Cadastro de até ${pricing.includedCouriers} entregadores`,
  "Acompanhamento das entregas em tempo real",
  "Histórico de entregas",
  "Sistema de cashback para clientes",
];

const menuItems = ["Logotipo próprio", "Cadastro de produtos, fotos e preços", "Link exclusivo para divulgação", "Atualização do cardápio"];

const conditions = ["Sem fidelidade", "Cancele quando quiser", "Pague somente enquanto utilizar", "Cobrança mensal recorrente"];

const faq = [
  { q: "Preciso assinar contrato com fidelidade?", a: "Não. O Pitou é cobrado mês a mês e você pode cancelar quando quiser. Você paga somente enquanto utilizar." },
  { q: "E se eu tiver mais de 5 entregadores?", a: `Cada entregador além dos ${pricing.includedCouriers} incluídos custa R$ ${money(pricing.extraCourier)} por mês.` },
  { q: "O Menu Digital é obrigatório?", a: `Não. É um adicional opcional de R$ ${money(pricing.menu)} por mês, para ter um cardápio online com a identidade do seu estabelecimento.` },
  { q: "O cliente precisa instalar algum aplicativo?", a: "Não. O cliente acompanha a entrega por um link que abre direto no navegador do celular." },
];

export default function Home() {
  return <div className="lp">
    <header className="lp-header">
      <div className="lp-wrap lp-header-inner">
        <a className="lp-logo" href="#inicio" aria-label="Pitou, início">
          <img src="/redesign/route-symbol.webp" alt="" width={40} height={38} />
          <span>Pitou</span>
        </a>
        <nav aria-label="Seções">
          <a href="#recursos">Recursos</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#precos">Preços</a>
        </nav>
        <a className="lp-btn lp-btn-dark lp-header-cta" href="/demo">Ver demonstração</a>
      </div>
    </header>

    <main id="inicio">
      <section className="lp-wrap lp-hero">
        <div className="lp-hero-copy">
          <span className="lp-eyebrow"><ShieldCheck size={18} aria-hidden="true" /> Entrega segura do balcão à porta</span>
          <h1>Suas entregas sob controle, do pedido à porta do cliente.</h1>
          <p>O Pitou reúne a gestão dos seus entregadores, o acompanhamento em tempo real e um cashback que traz o cliente de volta. Tudo em um único plano mensal, sem fidelidade.</p>
          <div className="lp-actions">
            <a className="lp-btn lp-btn-dark" href="/demo">Experimentar a demonstração <ArrowRight size={20} aria-hidden="true" /></a>
            <a className="lp-btn lp-btn-light" href="#precos">Ver preços</a>
          </div>
          <p className="lp-hero-note">A partir de <strong>R$ {money(pricing.base)}/mês</strong> com até {pricing.includedCouriers} entregadores.</p>
        </div>
        <div className="lp-hero-art">
          <img src="/redesign/map-preview.webp" alt="Mapa com a rota de uma entrega em andamento" width={1100} height={1100} />
          <div className="lp-float lp-float-top"><BellRing size={18} aria-hidden="true" /> Pedido #1042 saiu para entrega</div>
          <div className="lp-float lp-float-bottom"><span className="lp-dot" aria-hidden="true" /> Chegando em 6 min</div>
        </div>
      </section>

      <section id="recursos" className="lp-wrap lp-section">
        <div className="lp-section-head">
          <h2>Tudo o que a sua operação de entrega precisa</h2>
          <p>Uma solução completa para gestão, acompanhamento e segurança das entregas, além de ferramentas para fidelizar clientes.</p>
        </div>
        <div className="lp-features">
          {features.map(({ icon: Icon, title, text, tone }) => <article key={title} className={`lp-card lp-tone-${tone}`}>
            <span className="lp-icon"><Icon size={24} aria-hidden="true" /></span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>)}
        </div>
      </section>

      <section id="como-funciona" className="lp-wrap lp-section">
        <div className="lp-section-head">
          <h2>Como funciona</h2>
          <p>Estabelecimento, entregador e cliente acompanham o mesmo pedido, cada um na sua tela.</p>
        </div>
        <ol className="lp-steps">
          {steps.map(({ icon: Icon, who, text }, i) => <li key={who} className="lp-card">
            <span className="lp-step-num">{i + 1}</span>
            <span className="lp-icon"><Icon size={24} aria-hidden="true" /></span>
            <h3>{who}</h3>
            <p>{text}</p>
          </li>)}
        </ol>
        <div className="lp-demo-band">
          <div>
            <h3>Veja o fluxo funcionando</h3>
            <p>A demonstração simula um pedido real nos três perfis. Não precisa de cadastro.</p>
          </div>
          <a className="lp-btn lp-btn-dark" href="/demo">Abrir demonstração <ArrowRight size={20} aria-hidden="true" /></a>
        </div>
      </section>

      <section id="precos" className="lp-wrap lp-section">
        <div className="lp-section-head">
          <h2>Um plano simples, sem surpresas</h2>
          <p>Um único plano com tudo incluso. Você só adiciona o que precisar.</p>
        </div>
        <div className="lp-pricing">
          <article className="lp-plan">
            <span className="lp-plan-tag">Plano Único</span>
            <p className="lp-price"><span className="lp-currency">R$</span>{money(pricing.base)}<span className="lp-period">/mês</span></p>
            <ul className="lp-checks">
              {included.map(item => <li key={item}><Check size={20} aria-hidden="true" />{item}</li>)}
            </ul>
            <p className="lp-plan-extra"><Bike size={20} aria-hidden="true" /><span>Mais de {pricing.includedCouriers} entregadores? <strong>+ R$ {money(pricing.extraCourier)} por entregador/mês.</strong></span></p>
            <a className="lp-btn lp-btn-dark lp-btn-block" href="/demo">Conhecer na demonstração <ArrowRight size={20} aria-hidden="true" /></a>
          </article>

          <div className="lp-pricing-side">
            <article className="lp-card lp-addon">
              <div className="lp-addon-head">
                <span className="lp-icon"><MenuSquare size={24} aria-hidden="true" /></span>
                <div>
                  <span className="lp-addon-label">Adicional opcional</span>
                  <h3>Menu Digital Próprio</h3>
                </div>
                <p className="lp-addon-price">+ R$ {money(pricing.menu)}<span>/mês</span></p>
              </div>
              <p>Cardápio personalizado com a identidade visual do seu estabelecimento.</p>
              <ul className="lp-checks lp-checks-compact">
                {menuItems.map(item => <li key={item}><Check size={18} aria-hidden="true" />{item}</li>)}
              </ul>
            </article>
            <PriceSimulator />
          </div>
        </div>
        <ul className="lp-conditions" aria-label="Condições comerciais">
          {conditions.map(item => <li key={item}><ClipboardList size={18} aria-hidden="true" />{item}</li>)}
        </ul>
      </section>

      <section className="lp-wrap lp-section lp-faq-section">
        <div className="lp-section-head"><h2>Perguntas frequentes</h2></div>
        <div className="lp-faq">
          {faq.map(({ q, a }) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
        </div>
      </section>

      <section className="lp-wrap">
        <div className="lp-final">
          <h2>Pronto para entregar com mais segurança?</h2>
          <p>Teste o fluxo completo agora e veja como fica a experiência do seu cliente.</p>
          <a className="lp-btn lp-btn-light" href="/demo">Ver demonstração <ArrowRight size={20} aria-hidden="true" /></a>
        </div>
      </section>
    </main>

    <footer className="lp-wrap lp-footer">
      <span className="lp-logo lp-logo-small"><img src="/redesign/route-symbol.webp" alt="" width={28} height={27} /> Pitou</span>
      <span>© {new Date().getFullYear()} Pitou · pitou.com.br</span>
    </footer>
  </div>;
}
