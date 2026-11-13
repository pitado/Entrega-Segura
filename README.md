# Entrega Segura — MVP de entregas

Aplicação responsiva para **estabelecimento, motoboy e consumidor**, com Next.js 15, Cloudflare Workers/OpenNext, banco Neon PostgreSQL e mapas MapLibre/OpenFreeMap.

## Fluxos

- **Estabelecimento** (`/`): login administrativo por senha de MVP, cadastro de motoboys, criação e atribuição de pedidos, avanço/cancelamento com validação de status e link individual do cliente. Os pedidos demonstrativos **não são exibidos** no painel operacional.
- **Motoboy** (`/entregador/[token]`): acesso por link revogável, confirmação de etapas, envio de GPS autorizado enquanto a página está ativa e navegação externa.
- **Consumidor** (`/acompanhar/[token]`): acompanhamento de etapas e GPS recente, confirmação de recebimento pronto e opção explícita para informar sua localização como destino exato.
- **Simulação local** (`/demo`): viagem fictícia em armazenamento do navegador, sem login e sem sincronizar entre dispositivos.
- **Laboratório Neon** (`/laboratorio`): sessões de demonstração isoladas, com pedido, entregador e links individuais sincronizados entre dispositivos. Sessões válidas por 24h.

## Mapas e previsão de chegada

- **MapLibre GL + OpenFreeMap** renderiza ruas, pontos e marcadores SVG de moto/destino, mesmo sem a chave Mapbox.
- **Mapbox Directions API** (`mapbox/driving-traffic`) calcula rota pelas ruas, distância restante e ETA para **automóvel**, com dados de trânsito onde disponíveis. Não representa tempo garantido nem rota exclusiva para motocicletas.
- O Worker consulta Mapbox **somente se** `MAPBOX_ACCESS_TOKEN` estiver configurado; a chave não é enviada ao navegador.
- As rotas solicitadas são vinculadas a um pedido identificável pelo seu token de acompanhamento ou a um número de etapa do simulador local; não existe proxy público para coordenadas arbitrárias. Há cache curto e controle de frequência no cliente.
- Em pedidos operacionais, a previsão por rota exige **posição recente do motoboy e destino georreferenciado**. O consumidor pode confirmar o ponto via localização do navegador. Sem estes dados, o mapa não inventa o ETA.
- Links externos Google Maps e Apple Maps continuam disponíveis.

Veja [como configurar o Mapbox](docs/maps-setup.md).

## Configuração do Cloudflare Worker

Worker `entrega-segura2`, GitHub branch `teste-deploy`. Configure em **Settings → Variables and Secrets**:

| Variável | Tipo | Necessidade |
|---|---|---|
| `DATABASE_URL` | Secret | Obrigatório para pedidos, GPS e sessão de teste no Neon |
| `MVP_ADMIN_PASSWORD` | Secret | Obrigatório para acesso ao painel operacional |
| `MAPBOX_ACCESS_TOKEN` | Secret | Opcional até ativar Directions/ETA do Mapbox |

Não publique nenhuma credencial. Habilitar faturamento no Mapbox depende de autorização específica do responsável pela conta. O sistema não ativa serviços pagos automaticamente.

Build: `npx opennextjs-cloudflare build`; deploy: `npx wrangler deploy`.

## Auditoria e testes

A branch executa workflow no GitHub Actions: TypeScript, compilação Next.js e **smoke test do Worker ativo**. O teste funcional cria uma sessão **fictícia** no Neon, gera dois links, atribui motoboy, avança status, envia posição simulada, recebe confirmação do consumidor, conclui entrega e testa bloqueios de segurança. Ele não altera nem remove pedidos operacionais.

Execute manualmente:

```bash
npm install
npm run typecheck
npm run build
npm run test:smoke
```

Use `TEST_BASE_URL` para direcionar os testes para outra instalação do MVP. Requer `DATABASE_URL` funcional no Worker e estabelecimento piloto preparado para o laboratório.

## Antes da produção

- Sistema usa **um estabelecimento**, ainda não possui autenticação multiempresa ou perfis individuais completos.
- O GPS de navegador depende de permissão e página ativa; rastreamento de segundo plano exige app nativo.
- Tokens são acessos individuais: não compartilhe publicamente links de motoboys ou consumidores.
- Exigem-se política de privacidade e retenção, limite por IP/WAF, auditoria, controle de custos do provedor, autenticação forte e testes com aparelhos reais.
- Cashback financeiro, WhatsApp automático e modelos de IA preditiva **não** fazem parte das funcionalidades operacionais implementadas.

O repositório é um MVP, não uma plataforma de produção pronta para operar entregas com dados reais.
