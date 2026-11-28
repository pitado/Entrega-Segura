import type { Metadata } from "next";
import { ArrowRight, Check, Gift, Link2, MapPin, MessageCircle, Phone, Plus, ShieldCheck } from "lucide-react";
import Radar from "./components/Radar";
import Art from "./components/Art";
import PitouLogo from "./components/PitouLogo";
import PriceSimulator from "./PriceSimulator";
import { pricing } from "./pricing";
import "./landing.css";
import { jsonLd, siteDescription, siteName, siteTitle, siteUrl } from "../lib/seo";

export const metadata: Metadata = {
  title: { absolute: siteTitle },
  description: siteDescription,
  alternates: { canonical: "/" },
};

const money = (value: number) => value.toLocaleString("pt-BR", { minimumFractionDigits: value % 1 ? 2 : 0, maximumFractionDigits: 2 });

const included = [
  "Acesso completo à plataforma",
  `Cadastro de até ${pricing.includedCouriers} entregadores`,
  "Acompanhamento das entregas em tempo real",
  "Histórico de entregas",
  "Sistema de cashback para clientes",
];

const menuItems = ["Logotipo próprio", "Produtos, fotos e preços", "Link exclusivo", "Atualização do cardápio"];

const conditions = ["Sem fidelidade", "Cancele quando quiser", "Pague somente enquanto utilizar", "Cobrança mensal recorrente"];

const faq = [
  { q: "Preciso assinar contrato com fidelidade?", a: "Não. O Pitou é cobrado mês a mês e você pode cancelar quando quiser. Você paga somente enquanto utilizar." },
  { q: "O cliente precisa instalar algum aplicativo?", a: "Não. O cliente acompanha a entrega por um link que abre direto no navegador do celular." },
  { q: "Como funciona o código de entrega?", a: "Quando o entregador chega, o cliente vê no celular um código de 4 dígitos. O entregador digita esse código para concluir a entrega, e o painel mostra que ela foi verificada." },
  { q: `E se eu tiver mais de ${pricing.includedCouriers} entregadores?`, a: `Cada entregador além dos ${pricing.includedCouriers} incluídos custa R$ ${money(pricing.extraCourier)} por mês.` },
  { q: "O Menu Digital é obrigatório?", a: `Não. É um adicional de R$ ${money(pricing.menu)} por mês, para ter um cardápio online com a identidade do seu estabelecimento.` },
];

/** Dados estruturados (schema.org) para o Google entender a empresa, o produto, o preço e as perguntas frequentes. */
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${siteUrl}/#organizacao`, name: siteName, url: siteUrl, logo: `${siteUrl}/logo.png` },
    { "@type": "WebSite", "@id": `${siteUrl}/#site`, name: siteName, url: siteUrl, inLanguage: "pt-BR", publisher: { "@id": `${siteUrl}/#organizacao` } },
    {
      "@type": "SoftwareApplication",
      name: siteName,
      url: siteUrl,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: siteDescription,
      inLanguage: "pt-BR",
      publisher: { "@id": `${siteUrl}/#organizacao` },
      offers: { "@type": "Offer", price: pricing.base.toFixed(2), priceCurrency: "BRL", url: `${siteUrl}/#precos`, category: "Assinatura mensal" },
    },
    {
      "@type": "FAQPage",
      mainEntity: faq.map(item => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
    },
  ],
};

const steps = ["Preparo", "Em rota", "Destino", "Entregue"];

/** Tela do cliente em miniatura, usada no topo e em "Um pedido, três telas". */
function CustomerPhone({ compact = false }: { compact?: boolean }) {
  return <div className={`lp-phone${compact ? " lp-phone-compact" : ""}`} aria-hidden="true">
    <div className="lp-phone-top"><PitouLogo size={20} /><span className="lp-chip-dot">Pedido #1042</span></div>
    <div className="lp-eta">
      <span>Chega em</span>
      <b>8 min</b>
      <small>Lucas a caminho</small>
      <Art name="moto" className="lp-eta-art" label={false} />
    </div>
    <div className="lp-phone-row">
      <div className="lp-mini lp-mini-dark"><span className="lp-avatar">L</span><span><b>Lucas</b><small>Moto</small></span><span className="lp-round"><Phone size={13} /></span></div>
      <div className="lp-mini lp-mini-soft"><small><Gift size={12} /> Cashback</small><b>+ R$ 3,45</b></div>
    </div>
    <ol className="lp-track">{steps.map((step, i) => <li key={step} data-state={i === 0 ? "done" : i === 1 ? "now" : "next"}><i /><span>{step}</span></li>)}</ol>
    <div className="lp-phone-cta">Estou pronto para receber <span><Check size={14} strokeWidth={3} /></span></div>
  </div>;
}

function CourierPhone() {
  return <div className="lp-phone lp-phone-compact" aria-hidden="true">
    <div className="lp-phone-top"><PitouLogo size={20} /><span className="lp-chip-dot">Ao vivo</span></div>
    <div className="lp-progress"><span>Em rota <em>#1042</em></span><small>Etapa 2 de 4</small></div>
    <div className="lp-bars"><i data-on="" /><i data-on="" /><i /><i /></div>
    <div className="lp-eta lp-eta-courier"><b>8<small>min</small></b><span className="lp-km">2,3 km</span><Art name="moto" className="lp-eta-art" label={false} /></div>
    <div className="lp-mini lp-mini-dark lp-mini-col"><b>Ana Costa</b><small><MapPin size={12} /> Região central, Maringá</small><span className="lp-tag-yellow">Aguardando o cliente</span></div>
    <div className="lp-phone-cta lp-phone-cta-left"><span><ArrowRight size={14} /></span>Cheguei ao destino</div>
  </div>;
}

function MerchantForm() {
  return <div className="lp-phone lp-phone-compact lp-phone-form" aria-hidden="true">
    <b className="lp-form-title">Novo pedido</b>
    <label>Telefone do cliente (WhatsApp)<span>(44) 99701-2210</span></label>
    <p className="lp-form-hint"><Gift size={13} /> Cliente tem R$ 18,70 de cashback. Usar neste pedido?</p>
    <label>Nome do cliente<span>Juliana Ribeiro</span></label>
    <label>Entregador<span>Lucas</span></label>
    <div className="lp-phone-cta lp-phone-cta-center">Criar pedido</div>
  </div>;
}

export default function Home() {
  return <div className="lp">
    <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
    <div className="lp-header-wrap">
      <header className="lp-header lp-wrap">
        <a className="lp-logo" href="#inicio" aria-label="Pitou, início"><PitouLogo size={36} /></a>
        <nav aria-label="Seções">
          <a href="#como-funciona">Como funciona</a>
          <a href="#recursos">Recursos</a>
          <a href="#seguranca">Segurança</a>
          <a href="#precos">Preços</a>
          <a href="#perguntas">Perguntas</a>
        </nav>
        <div className="lp-header-actions">
          <a className="lp-header-login" href="/entrar">Entrar</a>
          <a className="lp-btn lp-btn-lime lp-btn-sm" href="/entrar?criar">Criar conta</a>
        </div>
      </header>
    </div>

    <main id="inicio">
      <section className="lp-wrap lp-hero">
        <div className="lp-hero-copy">
          <h1>Suas entregas sob controle, do pedido à porta do cliente.</h1>
          <p>O Pitou reúne a gestão dos seus entregadores, o acompanhamento em tempo real e um cashback que traz o cliente de volta. Tudo em um único plano mensal.</p>
          <div className="lp-actions">
            <a className="lp-btn lp-btn-lime" href="/entrar?criar">Criar minha conta <ArrowRight size={20} aria-hidden="true" /></a>
            <a className="lp-btn lp-btn-ghost" href="/demo">Ver demonstração</a>
          </div>
          <p className="lp-hero-note">A partir de <strong>R$ {money(pricing.base)}/mês</strong>, com até {pricing.includedCouriers} entregadores.</p>
          <ul className="lp-checks-inline">
            {["Sem fidelidade", "Cliente sem app", "Cancele quando quiser"].map(item => <li key={item}><Check size={16} aria-hidden="true" />{item}</li>)}
          </ul>
        </div>
        <div className="lp-hero-art">
          <svg className="lp-rings" viewBox="0 0 600 600" aria-hidden="true"><g fill="none" stroke="#0B1208" strokeOpacity=".09" strokeWidth="2"><circle cx="300" cy="380" r="120" /><circle cx="300" cy="380" r="220" /><circle cx="300" cy="380" r="320" /></g></svg>
          <Art name="moto" className="lp-hero-moto" />
          <CustomerPhone />
          <div className="lp-float lp-float-a"><span className="lp-float-icon"><ShieldCheck size={18} /></span><span><b>Entrega verificada</b><small>Código confirmado pelo cliente</small></span></div>
          <div className="lp-float lp-float-b"><Gift size={16} aria-hidden="true" /> + R$ 3,45 de cashback</div>
        </div>
      </section>

      <section id="como-funciona" className="lp-wrap lp-section">
        <div className="lp-section-head">
          <h2>Um pedido, três telas</h2>
          <p>Estabelecimento, entregador e cliente acompanham o mesmo pedido, cada um com o que precisa ver.</p>
        </div>
        <ol className="lp-three">
          <li className="lp-three-card lp-yellow">
            <span className="lp-num">1</span>
            <h3>Estabelecimento</h3>
            <p>Cria o pedido com o telefone do cliente e escolhe quem vai entregar.</p>
            <MerchantForm />
          </li>
          <li className="lp-three-card lp-lime">
            <span className="lp-num">2</span>
            <h3>Entregador</h3>
            <p>Recebe o pedido, sai para a entrega e compartilha a rota ao vivo.</p>
            <CourierPhone />
          </li>
          <li className="lp-three-card lp-soft">
            <span className="lp-num">3</span>
            <h3>Cliente</h3>
            <p>Acompanha pelo celular, sem aplicativo, e avisa quando está pronto.</p>
            <CustomerPhone compact />
          </li>
        </ol>
        <div className="lp-demo-band">
          <span className="lp-demo-icon"><ArrowRight size={20} aria-hidden="true" /></span>
          <div>
            <h3>Veja o fluxo funcionando</h3>
            <p>A demonstração simula um pedido nos três perfis. Não precisa de cadastro.</p>
          </div>
          <a className="lp-btn lp-btn-lime lp-btn-sm" href="/demo">Abrir demonstração <ArrowRight size={18} aria-hidden="true" /></a>
        </div>
      </section>

      <section id="recursos" className="lp-wrap lp-section">
        <div className="lp-section-head">
          <h2>Tudo o que a sua operação de entrega precisa</h2>
          <p>Gestão, acompanhamento e segurança das entregas, e ferramentas para fidelizar clientes.</p>
        </div>
        <div className="lp-bento">
          <article className="lp-tile lp-lime lp-tile-live">
            <div className="lp-tile-copy">
              <h3>Cada entrega à vista</h3>
              <p>Veja onde cada entrega está agora, do preparo até a porta do cliente.</p>
            </div>
            <ul className="lp-live-list" aria-label="Exemplo de entregas">
              {[["A", "Ana Costa", "#1042 · Lucas", "Em rota", "lime"], ["M", "Marcos Lima", "#1041 · Mariana", "Preparando", "yellow"], ["J", "Júlia Reis", "#1040 · Rafael", "No destino", "soft"]].map(([i, name, meta, status, tone]) =>
                <li key={name}><span className="lp-avatar">{i}</span><span><b>{name}</b><small>{meta}</small></span><em data-tone={tone}>{status}</em></li>)}
            </ul>
            <Art name="moto" className="lp-tile-moto" />
          </article>

          <article className="lp-tile lp-dark lp-tile-team">
            <h3>Sua equipe de entrega</h3>
            <p>Cadastre seus entregadores. O plano já inclui até {pricing.includedCouriers}.</p>
            <div className="lp-slots"><span>Vagas usadas</span><b>3 de {pricing.includedCouriers}</b></div>
            <div className="lp-slot-bar" aria-hidden="true"><i style={{ width: "60%" }} /></div>
            <ul className="lp-team">
              {[["L", "Lucas", "Em rota", "on"], ["M", "Mariana", "Livre", "free"], ["R", "Rafael", "Offline", "off"]].map(([i, name, state, s]) =>
                <li key={name}><span className="lp-avatar" data-s={s}>{i}</span><b>{name}</b><small data-s={s}>{state}</small></li>)}
            </ul>
          </article>

          <article className="lp-tile lp-white lp-tile-history">
            <h3>Histórico completo</h3>
            <p>Consulte entregas passadas, quem levou e quando foram concluídas.</p>
            <ul className="lp-history">
              {[["#1038 · Paulo Nunes", "Ontem, 19:42 · Lucas", "41,00"], ["#1037 · Carla Dias", "Ontem, 19:15 · Mariana", "73,50"], ["#1036 · Beto Souza", "Ontem, 18:58 · Lucas", "29,90"], ["#1035 · Dani Alves", "Ontem, 18:31 · Rafael", "52,00"]].map(([a, b, v]) =>
                <li key={a}><span><b>{a}</b><small>{b}</small></span><span className="lp-history-val">R$ {v}</span><em>Entregue</em></li>)}
            </ul>
          </article>

          <article className="lp-tile lp-yellow lp-tile-cashback">
            <h3>Cashback para clientes</h3>
            <p>Devolva parte do valor como crédito e traga o cliente de volta.</p>
            <b className="lp-big">5%</b>
            <div className="lp-credit"><span>Crédito para o próximo pedido</span><b>R$ 3,45</b></div>
            <small className="lp-tile-note">Você escolhe o percentual.</small>
          </article>

          <article className="lp-tile lp-soft lp-tile-link">
            <h3>Link para o cliente</h3>
            <p>O cliente acompanha pelo celular, sem instalar aplicativo.</p>
            <div className="lp-link-box"><Link2 size={16} aria-hidden="true" /> pitou.com.br/acompanhar/…</div>
            <div className="lp-whats"><MessageCircle size={16} aria-hidden="true" /> Enviar pelo WhatsApp</div>
          </article>

          <article className="lp-tile lp-dark lp-tile-menu">
            <div className="lp-tile-copy">
              <h3>Menu Digital Próprio</h3>
              <p>Um cardápio online com a cara do seu estabelecimento: logotipo, produtos, fotos, preços e um link exclusivo para divulgar.</p>
            </div>
            <ul className="lp-foods" aria-label="Exemplo de cardápio">
              {([["burger", "Smash burger", "28,90", "yellow"], ["juice", "Suco natural", "9,50", "soft"], ["fries", "Batata média", "14,00", "coral"]] as const).map(([art, name, price, tone]) =>
                <li key={name}><span className="lp-food-art" data-tone={tone}><img src={`https://images.pexels.com/photos/${({ burger: 15226134, juice: 15560947, fries: 13187600 } as const)[art]}/pexels-photo-${({ burger: 15226134, juice: 15560947, fries: 13187600 } as const)[art]}.jpeg?auto=compress&cs=tinysrgb&w=480`} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit", minHeight: 0 }} /></span><span><b>{name}</b><small>R$ {price}</small></span><span className="lp-add"><Plus size={16} /></span></li>)}
            </ul>
          </article>
        </div>
      </section>

      <section id="seguranca" className="lp-wrap lp-section">
        <div className="lp-secure">
          <div className="lp-secure-copy">
            <h2>A entrega só termina com o código do cliente.</h2>
            <p>Quando o entregador chega, o cliente vê um código no celular. Só com ele a entrega é concluída, sem depender de mensagem ou ligação.</p>
            <ul className="lp-checks">
              {["Cada pedido tem um código próprio de 4 dígitos", "O código aparece só na tela do cliente", "O entregador digita na hora de entregar, e o painel mostra a entrega verificada"].map(item => <li key={item}><Check size={16} aria-hidden="true" />{item}</li>)}
            </ul>
            <div className="lp-code" aria-label="Exemplo de código: 4 8 2 7">{["4", "8", "2", "7"].map((d, i) => <span key={i} aria-hidden="true">{d}</span>)}</div>
            <p className="lp-secure-note"><ShieldCheck size={15} aria-hidden="true" /> O Pitou nunca pede esse código por mensagem ou ligação.</p>
          </div>
          <div className="lp-secure-phones" aria-hidden="true">
            <div className="lp-phone lp-phone-compact">
              <div className="lp-phone-top"><PitouLogo size={20} /><span className="lp-chip-dot">Pedido #1042</span></div>
              <b className="lp-secure-title">Lucas chegou</b>
              <small className="lp-secure-sub">Está a menos de 30 m de você.</small>
              <Radar distance={20} dotLabel="Lucas" />
              <div className="lp-secure-card"><small>Seu código de entrega</small><div className="lp-code lp-code-sm">{["4", "8", "2", "7"].map((d, i) => <span key={i}>{d}</span>)}</div></div>
            </div>
            <div className="lp-phone lp-phone-compact lp-secure-second">
              <div className="lp-phone-top"><PitouLogo size={20} /><span className="lp-chip-dot">Ao vivo</span></div>
              <div className="lp-progress"><span>No destino <em>#1042</em></span><small>Etapa 3 de 4</small></div>
              <b className="lp-secure-title">Menos de 30 m</b>
              <Radar distance={20} centerLabel="Ana" dotLabel="Você" />
              <div className="lp-secure-card lp-secure-card-soft"><small>Código de entrega</small><div className="lp-code lp-code-sm lp-code-light">{["4", "8", "2", "7"].map((d, i) => <span key={i}>{d}</span>)}</div></div>
              <div className="lp-phone-cta lp-phone-cta-center"><Check size={14} strokeWidth={3} /> Concluir entrega</div>
            </div>
          </div>
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
              {included.map(item => <li key={item}><span className="lp-check"><Check size={14} strokeWidth={3} aria-hidden="true" /></span>{item}</li>)}
            </ul>
            <p className="lp-plan-extra">Mais de {pricing.includedCouriers} entregadores? <strong>+ R$ {money(pricing.extraCourier)} por entregador/mês.</strong></p>
            <a className="lp-btn lp-btn-ink lp-btn-block" href="/entrar?criar">Assinar o Pitou <ArrowRight size={20} aria-hidden="true" /></a>
          </article>

          <div className="lp-pricing-side">
            <article className="lp-addon">
              <div className="lp-addon-head">
                <div>
                  <h3>Menu Digital Próprio</h3>
                  <span className="lp-addon-label">Adicional</span>
                </div>
                <p className="lp-addon-price">+ R$ {money(pricing.menu)}<span>/mês</span></p>
              </div>
              <p className="lp-muted">Cardápio personalizado com a identidade visual do seu estabelecimento.</p>
              <div className="lp-addon-body">
                <ul className="lp-checks lp-checks-compact">
                  {menuItems.map(item => <li key={item}><span className="lp-check"><Check size={12} strokeWidth={3} aria-hidden="true" /></span>{item}</li>)}
                </ul>
                <span className="lp-addon-art" aria-hidden="true"><Art name="burger" label={false} /><Art name="juice" label={false} /></span>
              </div>
            </article>
            <PriceSimulator />
          </div>
        </div>
        <ul className="lp-conditions" aria-label="Condições comerciais">
          {conditions.map(item => <li key={item}><span className="lp-check"><Check size={12} strokeWidth={3} aria-hidden="true" /></span>{item}</li>)}
        </ul>
      </section>

      <section id="perguntas" className="lp-wrap lp-section lp-faq-section">
        <div className="lp-faq-side">
          <h2>Perguntas frequentes</h2>
          <div className="lp-faq-demo">
            <h3>Prefere ver na prática?</h3>
            <p>Abra a demonstração e acompanhe um pedido do começo ao fim.</p>
            <a className="lp-btn lp-btn-ink lp-btn-sm" href="/demo">Abrir demonstração <ArrowRight size={18} aria-hidden="true" /></a>
            <Art name="box" className="lp-faq-moto lp-faq-handoff" label={false} />
          </div>
        </div>
        <div className="lp-faq">
          {faq.map(({ q, a }, i) => <details key={q} open={i === 0}><summary>{q}<span className="lp-faq-icon" aria-hidden="true"><Plus size={16} strokeWidth={3} /></span></summary><p>{a}</p></details>)}
        </div>
      </section>

      <section className="lp-wrap">
        <div className="lp-final">
          <div className="lp-final-copy">
            <h2>Pronto para entregar com mais segurança?</h2>
            <p>Crie sua conta, cadastre seus entregadores e envie o primeiro pedido hoje.</p>
            <a className="lp-btn lp-btn-ink" href="/entrar?criar">Criar minha conta <ArrowRight size={20} aria-hidden="true" /></a>
          </div>
          <Art name="box" className="lp-final-box" />
        </div>
      </section>
    </main>

    <footer className="lp-wrap lp-footer">
      <div className="lp-footer-brand">
        <PitouLogo size={34} />
        <p>Gestão e acompanhamento de entregas para o seu estabelecimento.</p>
      </div>
      <nav aria-label="Produto"><b>Produto</b><a href="#como-funciona">Como funciona</a><a href="#recursos">Recursos</a><a href="#seguranca">Segurança</a><a href="#precos">Preços</a></nav>
      <nav aria-label="Conta"><b>Conta</b><a href="/entrar">Entrar</a><a href="/entrar?criar">Criar conta</a><a href="/demo">Demonstração</a></nav>
      <div className="lp-footer-bottom"><span>© {new Date().getFullYear()} Pitou</span><span>pitou.com.br</span></div>
    </footer>
  </div>;
}
