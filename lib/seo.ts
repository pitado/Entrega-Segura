// Dados de SEO compartilhados entre o layout, a página inicial, o sitemap e o robots.txt.
export const siteUrl = "https://pitou.com.br";
export const siteName = "Pitou";
export const siteTitle = "Pitou · Entregas sob controle para o seu estabelecimento";
export const siteDescription = "Gestão e acompanhamento das entregas do seu estabelecimento em tempo real, com entregadores próprios, código de entrega, histórico e cashback para fidelizar clientes.";
export const ogImage = { url: "/og.png", width: 1200, height: 630, alt: "Pitou · Entregas sob controle, do pedido à porta do cliente" };

/** Serializa JSON-LD sem permitir que "</script>" feche a tag. */
export const jsonLd = (data: unknown) => ({ __html: JSON.stringify(data).replace(/</g, "\\u003c") });
