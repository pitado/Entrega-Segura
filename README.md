# Entrega Segura — MVP demonstrativo

Protótipo funcional para validação de uma plataforma que conecta estabelecimentos, entregadores e consumidores.

## Rodar localmente

Requer Node.js 20 ou superior.

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

## Funcionalidades disponíveis

- Painel com pedidos e indicadores básicos.
- Criação de pedidos demonstrativos.
- Fila do entregador e mudança de status.
- Visão do consumidor com confirmação de recebimento pronto.
- Persistência local no navegador via `localStorage`.
- Layout responsivo para celular e desktop.

## Limitações importantes

**Este é um protótipo, não uma operação pronta para produção.** Os dados são locais ao navegador e não sincronizam entre aparelhos. Não há autenticação, API, banco de dados, GPS real, cálculo de ETA, envio de WhatsApp, cashback financeiro nem IA. O mapa é ilustrativo. Não use para pedidos reais nem para compartilhar informações pessoais de clientes. O acompanhamento via link requer backend e controle de acesso antes de entrar em produção.

## Próximas etapas

1. PostgreSQL + ORM, API de pedidos e autenticação por estabelecimento/entregador.
2. Tokens de acompanhamento de curta duração, com expiração e proteção contra enumeração.
3. Geolocalização consentida, atualização em tempo real, ETA e mapa de provedor licenciado.
4. Notificações WhatsApp por provedor autorizado.
5. Regras antifraude, créditos promocionais e auditoria.
6. Controles LGPD, retenção limitada de localização, testes e monitoramento.

## Publicar no GitHub

```bash
git init
git add .
git commit -m "feat: MVP demonstrativo Entrega Segura"
git branch -M main
gh repo create entrega-segura --private --source=. --remote=origin --push
```

O último comando requer GitHub CLI autenticado. Escolha `--public` apenas se desejar tornar o código público.
