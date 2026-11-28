# Pitou — MVP de entregas

**Site:** [pitou.com.br](https://pitou.com.br).

Aplicação responsiva para **estabelecimento, motoboy e consumidor**, com Next.js 15, Cloudflare Workers/OpenNext, banco Neon PostgreSQL e mapas MapLibre/OpenFreeMap.

## O que o Pitou faz

- **Página inicial** (`/`): apresenta o Pitou e o plano comercial (valores em `app/pricing.ts`).
- **Conta do estabelecimento** (`/entrar`): cadastro e login com e-mail e senha. Cada estabelecimento vê só os próprios dados.
- **Painel** (`/painel`):
  - **Pedidos:** cria pedidos (cliente, telefone, endereço, valor, observações), atribui entregador, acompanha no mapa em tempo real, envia o link ao cliente pelo WhatsApp e conclui ou cancela.
  - **Histórico:** entregas concluídas e canceladas por período, entregador e busca, com totais de vendas, cashback e tempo médio.
  - **Entregadores:** até 5 no plano; vagas adicionais de R$ 50/mês. Cada entregador recebe um link próprio, que pode ser bloqueado ou trocado.
  - **Clientes e cashback:** porcentagem e pedido mínimo definidos pelo estabelecimento. O cliente, identificado pelo telefone, ganha saldo quando a entrega é concluída e pode usá-lo no próximo pedido. Cancelar um pedido devolve o saldo usado.
  - **Cardápio digital:** adicional de R$ 49,90/mês com logo, cor, produtos, fotos (por link https), preços e link exclusivo `/m/<endereço>`.
  - **Conta e plano:** dados do estabelecimento, ponto de saída no mapa e mensalidade calculada pelo plano.
- **Entregador** (`/entregador/<link>`): vê as entregas atribuídas, avança as etapas, abre Waze ou Google Maps e compartilha o GPS pelo navegador.
- **Cliente** (`/acompanhar/<link>`): status, mapa com o entregador, previsão de chegada (com Mapbox), aviso de "pronto para receber" e saldo de cashback.
- **Demonstração** (`/demo`): continua com um pedido fictício salvo no navegador, para quem quer ver o fluxo sem criar conta.

A cobrança da mensalidade ainda não é automática: o painel mostra o valor, e a cobrança é combinada fora do sistema.

## Banco de dados

O esquema fica em `db/`. Para aplicar as mudanças deste painel num banco que já tem as tabelas do MVP:

```bash
psql "$DATABASE_URL" -f db/migrations/001_painel_real.sql
```

A migração só cria tabelas, colunas e índices, e pode ser executada mais de uma vez. `db/000_base.sql` reconstrói o esquema anterior para desenvolvimento local; não rode em produção.

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
| `DATABASE_URL` | Secret | Obrigatório: contas, pedidos, GPS, cashback e cardápio no Neon |
| `PITOU_SIGNUP_CODE` | Secret | Opcional. Se definido, o cadastro de novos estabelecimentos exige este código de convite |
| `MAPBOX_ACCESS_TOKEN` | Secret | Opcional: rota, previsão de chegada e localização automática dos endereços |

Não publique nenhuma credencial. Habilitar faturamento no Mapbox depende de autorização específica do responsável pela conta. O sistema não ativa serviços pagos automaticamente.

Build: `npx opennextjs-cloudflare build`; deploy: `npx wrangler deploy`.

**Publicação automática:** cada push em `main` roda `.github/workflows/deploy.yml`, que compila e publica no Worker `pitou`. Precisa do secret `CLOUDFLARE_API_TOKEN` no repositório (Cloudflare → My Profile → API Tokens → modelo "Edit Cloudflare Workers"). Sem o secret, o workflow apenas avisa e não publica. Também pode ser disparado manualmente em Actions → "Publicar no Cloudflare" → Run workflow.

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

Por padrão o smoke test usa `https://pitou.com.br` e, se o domínio ainda não responder, `https://pitou.miguellpitaa.workers.dev`. Use `TEST_BASE_URL` para direcionar os testes para outra instalação (no GitHub Actions, defina a variável de repositório `TEST_BASE_URL`).

O teste de ponta a ponta do painel cria contas e pedidos de teste, então roda só localmente ou numa branch de desenvolvimento do Neon:

```bash
E2E_BASE_URL=http://localhost:3000 node scripts/e2e-painel.mjs
```

Para desenvolver sem acesso ao Neon, `NEON_LOCAL_ENDPOINT` aponta o driver para um servidor local compatível com o protocolo HTTP do Neon.

## Antes da produção

- A cobrança da mensalidade não é automática.
- O GPS do navegador depende de permissão e de a página estar aberta; rastreamento em segundo plano exige app nativo.
- Links de entregador e de cliente são acessos individuais: não os publique.
- Fotos e logo entram por link https; ainda não há upload de imagens.
- Falta recuperação de senha por e-mail e mais de um usuário por estabelecimento.
- Recomenda-se política de privacidade (LGPD), limite por IP/WAF e testes com aparelhos reais.

## Licença

Projeto proprietário. Todos os direitos reservados. Consulte [LICENSE](LICENSE).
