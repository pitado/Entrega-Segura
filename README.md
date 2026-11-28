# Pitou — MVP de entregas

**Site:** [pitou.com.br](https://pitou.com.br).

Aplicação responsiva para **estabelecimento, motoboy e consumidor**, com Next.js 15, Cloudflare Workers/OpenNext, banco Neon PostgreSQL e mapas MapLibre/OpenFreeMap.

## Protótipo

A página inicial abre a demonstração em `/demo`. Os três perfis trabalham com o mesmo pedido fictício, salvo no navegador.

- **Estabelecimento** cria, pesquisa e filtra pedidos.
- **Entregador** inicia o trajeto e avança as etapas da entrega.
- **Cliente** acompanha o status e confirma que está pronto para receber.

O protótipo usa um mapa ilustrativo e oferece links externos de navegação. As APIs do MVP continuam no código.

## Mapas e previsão de chegada

- **MapLibre GL + OpenFreeMap** renderiza ruas, pontos e marcadores SVG de moto/destino, mesmo sem a chave Mapbox.
- **Mapbox Directions API** (`mapbox/driving-traffic`) calcula rota pelas ruas, distância restante e ETA para **automóvel**, com dados de trânsito onde disponíveis. Não representa tempo garantido nem rota exclusiva para motocicletas.
- O Worker consulta Mapbox **somente se** `MAPBOX_ACCESS_TOKEN` estiver configurado; a chave não é enviada ao navegador.
- As rotas solicitadas são vinculadas a um pedido identificável pelo seu token de acompanhamento ou a um número de etapa do simulador local; não existe proxy público para coordenadas arbitrárias. Há cache curto e controle de frequência no cliente.
- Em pedidos operacionais, a previsão por rota exige **posição recente do motoboy e destino georreferenciado**. O consumidor pode confirmar o ponto via localização do navegador. Sem estes dados, o mapa não inventa o ETA.
- Links externos Google Maps e Apple Maps continuam disponíveis.

Veja [como configurar o Mapbox](docs/maps-setup.md).

## Configuração do Cloudflare Worker

Worker `pitou`, GitHub branch `main`. Configure em **Settings → Variables and Secrets**:

| Variável | Tipo | Necessidade |
|---|---|---|
| `DATABASE_URL` | Secret | Obrigatório para pedidos, GPS e sessão de teste no Neon |
| `MVP_ADMIN_PASSWORD` | Secret | Obrigatório para acesso ao painel operacional |
| `MAPBOX_ACCESS_TOKEN` | Secret | Opcional até ativar Directions/ETA do Mapbox |

Não publique nenhuma credencial. Habilitar faturamento no Mapbox depende de autorização específica do responsável pela conta. O sistema não ativa serviços pagos automaticamente.

Build: `npx opennextjs-cloudflare build`; deploy: `npx wrangler deploy`.

### Domínio pitou.com.br

O `wrangler.jsonc` publica o Worker como **Custom Domain** em `pitou.com.br` e `www.pitou.com.br` e mantém o endereço `pitou.miguellpitaa.workers.dev`; o `www` redireciona (301) para o endereço sem `www`.

1. Adicione `pitou.com.br` como site na conta Cloudflare (plano Free basta).
2. No Registro.br, troque os servidores DNS do domínio pelos dois nameservers indicados pela Cloudflare e aguarde a zona ficar **Active**.
3. Publique o Worker. A Cloudflare cria os registros DNS e o certificado TLS dos dois endereços automaticamente.

Enquanto a zona não estiver ativa na conta, o deploy com estas rotas falha. Nesse caso, conclua os passos 1 e 2 antes de publicar.

## Auditoria e testes

A branch executa workflow no GitHub Actions: TypeScript, compilação Next.js e **smoke test do Worker ativo**. O teste funcional cria uma sessão **fictícia** no Neon, gera dois links, atribui motoboy, avança status, envia posição simulada, recebe confirmação do consumidor, conclui entrega e testa bloqueios de segurança. Ele não altera nem remove pedidos operacionais.

Execute manualmente:

```bash
npm install
npm run typecheck
npm run build
npm run test:smoke
```

Por padrão os testes usam `https://pitou.com.br` e, se o domínio ainda não responder, `https://pitou.miguellpitaa.workers.dev`. Use `TEST_BASE_URL` para direcionar os testes para outra instalação do MVP (no GitHub Actions, defina a variável de repositório `TEST_BASE_URL`). Requer `DATABASE_URL` funcional no Worker e estabelecimento piloto preparado para o laboratório.

## Antes da produção

- Sistema usa **um estabelecimento**, ainda não possui autenticação multiempresa ou perfis individuais completos.
- O GPS de navegador depende de permissão e página ativa; rastreamento de segundo plano exige app nativo.
- Tokens são acessos individuais: não compartilhe publicamente links de motoboys ou consumidores.
- Exigem-se política de privacidade e retenção, limite por IP/WAF, auditoria, controle de custos do provedor, autenticação forte e testes com aparelhos reais.
- Cashback financeiro, WhatsApp automático e modelos de IA preditiva **não** fazem parte das funcionalidades operacionais implementadas.

O repositório é um MVP, não uma plataforma de produção pronta para operar entregas com dados reais.

## Licença

Projeto proprietário. Todos os direitos reservados. Consulte [LICENSE](LICENSE).
