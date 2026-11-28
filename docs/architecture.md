# Pitou — arquitetura

## Camadas
- **Next.js 15 / React 19** no Cloudflare Workers (OpenNext). Páginas do produto em `app/entrar`, `app/painel`, `app/entregador`, `app/acompanhar` e `app/m`; demonstração em `app/demo`.
- **Neon PostgreSQL** pelo driver HTTP `@neondatabase/serverless` (`lib/db.ts`). Esquema em `db/`.
- **Mapas:** MapLibre + OpenFreeMap no navegador (`app/components/LiveMap.tsx`). Rota e previsão pelo Mapbox no servidor (`/api/maps/route`), só com `MAPBOX_ACCESS_TOKEN`.

## Acesso
- **Estabelecimento:** e-mail e senha (PBKDF2-SHA256, 100 mil iterações). A sessão é um token aleatório em cookie `httpOnly`; o banco guarda só o SHA-256. Login com limite de 8 falhas em 15 minutos por e-mail. Toda rota `/api/painel/*` passa por `withAccount` (`lib/panel.ts`) e filtra pelo estabelecimento da sessão.
- **Entregador:** link com token de 64 caracteres hexadecimais; o banco guarda só o hash. Pode ser bloqueado ou trocado no painel.
- **Cliente:** link com o `tracking_token` (UUID aleatório) do pedido, válido por 7 dias. Mostra só a própria entrega.
- Toda mutação exige a mesma origem (`Origin`).

## Regras de negócio
- Status: `preparing → on_route → arrived → delivered`, com cancelamento pelo estabelecimento até a entrega (`lib/orders.ts`).
- Cashback: crédito na entrega (`(valor − cashback usado) × %`, se atingir o pedido mínimo), débito ao criar o pedido e estorno no cancelamento. Cada movimento fica em `cashback_entries`, e o saldo em `customers` é atualizado na mesma instrução SQL.
- Plano: 5 entregadores ativos incluídos + `extra_couriers`; cardápio público só com `menu_enabled`. A mensalidade exibida usa `app/pricing.ts`.

## Ainda não implementado
- Cobrança automática, upload de imagens, recuperação de senha, múltiplos usuários por estabelecimento, WhatsApp automático e app nativo.
