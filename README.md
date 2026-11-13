# Entrega Segura — MVP operacional e de simulação

Aplicação experimental para estabelecimentos com frota própria, entregadores e consumidores. Next.js 15 com OpenNext em Cloudflare Workers e PostgreSQL 17 no Neon.

## Interfaces

- Painel principal (/): acesso por senha, cadastro de entregadores e pedidos, despacho, status, localização atual autorizada e links de acompanhamento.
- Entregador (/entregador): acesso por token individual revogável, etapas de entrega, navegação externa, compartilhamento opcional de GPS enquanto a página está ativa.
- Consumidor (/acompanhar): link único por pedido, mapa com localização autorizada e confirmação de recebimento pronto.
- Simulação (/demo): viagem fictícia com deslocamento automático, etapas, confirmação do cliente e troca de interfaces sem autenticação.

A simulação usa armazenamento local e sincronização entre abas no mesmo navegador. Não sincroniza entre aparelhos. A base cartográfica de simulação usa OpenStreetMap, e o trajeto é ilustrativo. A aplicação real armazena dados no Neon; links individuais usam backend e permissões.

## Configurar Cloudflare Worker

Em Settings > Variables and Secrets do projeto entrega-segura2:

| Variável | Tipo | Uso |
| --- | --- | --- |
| DATABASE_URL | Secret | URL PostgreSQL da base entrega_segura no Neon |
| MVP_ADMIN_PASSWORD | Secret | Senha longa e exclusiva de administração do MVP |
| GOOGLE_MAPS_BROWSER_KEY | Text | Chave do Google Maps JavaScript com restrição por domínio |
| APPLE_MAPKIT_JS_TOKEN | Text | JWT válido do MapKit JS para o domínio |

A conta Google deve ter Maps JavaScript API habilitada e cobrança configurada. A chave deve ser restrita ao seu domínio nas restrições de referência HTTP e somente às APIs necessárias. Apple MapKit JS exige credenciais Apple Developer e token MapKit JS assinado (JWT). Tokens têm prazo de validade e precisarão de renovação automatizada para uso contínuo.

Workers Builds: branch teste-deploy; build npx opennextjs-cloudflare build; deploy npx wrangler deploy.

## Segurança e limites do MVP

A operação real só é habilitada quando DATABASE_URL e MVP_ADMIN_PASSWORD estiverem configuradas. O estabelecimento é único nesta versão e usa senha por cookie HttpOnly, Secure e SameSite=Strict. O entregador recebe uma URL de acesso revogável; o consumidor recebe token UUID não enumerável válido por sete dias. O painel não está pronto para empresas múltiplas. O GPS não inicia sem ação do entregador e permissão do navegador; localização fica indisponível quando não atualizada por dois minutos. No iPhone e Android, atualização em segundo plano não é garantida com o navegador fechado ou tela bloqueada. Antes de uso comercial, implementar autenticação individual, rate limiting, auditoria, política de privacidade, consentimento e retenção LGPD.

Não inclui ainda créditos financeiros/cashback, WhatsApp automático, ETA real, IA preditiva ou navegação curva a curva integrada. Esses itens não são anunciados como funcionais.
