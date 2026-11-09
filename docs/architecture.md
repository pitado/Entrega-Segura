# Entrega Segura — arquitetura incremental

## Implementado
- Next.js 15 / React 19: demonstração das três interfaces, com estado local no navegador.
- Neon PostgreSQL 17: projeto isolado, tabelas establishments, couriers, orders e order_events.
- Driver @neondatabase/serverless e API GET /api/health para verificação de conectividade.
- API GET /api/tracking/[token]: consulta somente status e confirmação de preparo, com token UUID não enumerável, janela de 7 dias e sem exposição de nome/endereço.

## Ainda não implementado
- Login, sessões e autorização multiestabelecimento; portanto, nenhuma API de criação/edição de pedidos foi aberta publicamente.
- Sincronização da interface com o banco, rastreamento GPS, mapas/ETA, WhatsApp, cashback real e IA.
- Proteções operacionais adicionais: rate limiting, auditoria, políticas de retenção LGPD e testes de carga.

## Hospedagem
A aplicação agora exige runtime Next.js para APIs. Exportação estática foi removida. Para Cloudflare Workers, usar adaptador compatível com Next.js e configurar DATABASE_URL como secret, nunca como NEXT_PUBLIC_.
