# Integração de Mapas — Mapbox + MapLibre

O Entrega Segura utiliza o **OpenFreeMap** como mapa de base, renderizado por MapLibre GL JS. Os pontos de motoboy e destino são SVGs simples e legíveis no mobile. O **Mapbox Directions** gera o percurso pelas ruas e uma estimativa para veículos; não é necessário habilitar Google Cloud.

## Ativar a rota e o ETA

1. Acesse https://account.mapbox.com/ e crie sua conta.
2. Em https://account.mapbox.com/access-tokens/ crie um token dedicado ao Entrega Segura, com as menores permissões necessárias para consultar Directions. Verifique as regras de cobrança e configure alertas/limites de uso antes de ativar serviços faturados. **Não autorize cobranças sem revisar os preços.**
3. Abra https://dash.cloudflare.com/ → Workers & Pages → `entrega-segura2` → Settings → Variables and Secrets.
4. Crie o secret **`MAPBOX_ACCESS_TOKEN`** e cole seu token no valor. Não precisa copiar o token para GitHub nem enviá-lo nesta conversa.
5. Salve e publique uma nova versão do Worker.
6. No celular, abra `/demo` para visualizar a moto e a linha por ruas na simulação. Em `/laboratorio`, inicie sessão Neon e teste os links nos três lados.

**Atenção à restrição de URL:** o token é usado no lado **servidor** do Worker; tokens do Mapbox com restrições de referer/webpage podem rejeitar chamadas feitas pelo Worker, que não são chamadas diretas do navegador. Use escopos mínimos, não exponha o segredo e aplique controles de uso no Mapbox e Cloudflare.

## Tratamento de localização e privacidade

- A posição é enviada somente após a ação do entregador e autorização explícita do navegador.
- O cliente pode permitir uma leitura pontual da localização para definir o destino; não há acompanhamento contínuo do consumidor.
- A API de rotas valida token do pedido (ou posição do roteiro de demonstração) antes de consultar o Mapbox; não aceita coordenadas arbitrárias do navegador.
- Localização com mais de dois minutos não é considerada atual no fluxo operacional.
- Sem GPS e destino confirmado, a tela apresenta “—” para tempo/distância, evitando ETA inventado.
- As atualizações do status são consultadas periodicamente; o navegador não mantém GPS em segundo plano de forma garantida.

## Performance

- MapLibre renderiza blocos vetoriais com carregamento progressivo.
- O Worker consulta o Mapbox Directions apenas quando a viagem está ativa; o front evita recalcular com cada movimento de poucos metros e o Worker usa cache curto.
- A rota tem linha principal com borda branca para contraste; marcadores distinguem moto (azul-ardósia) e destino (terracota).
- O perfil utilizado é **`mapbox/driving-traffic`**, que inclui trânsito quando disponível e **não corresponde a roteamento específico para motos**.

Informações de API: https://docs.mapbox.com/api/navigation/directions/ e https://docs.mapbox.com/help/getting-started/access-tokens/.

## Navegação no Waze

O **botão Navegar com Waze** está disponível no mapa de cada entrega e na área do motoboy, inclusive no laboratório. Utiliza [Waze Deep Links](https://developers.google.com/waze/deeplinks) por URL HTTPS, sem API key e sem ativação de faturamento.

- Se houver latitude e longitude confirmadas, o link usa `ll=latitude,longitude`; caso contrário, busca o endereço com `q=`.
- Envia `navigate=yes` e `vehicle_type=motorcycle`, além de `utm_source=entrega-segura`.
- No celular com Waze instalado, abre o aplicativo; nos demais casos abre a experiência Web do Waze.
- **O Waze não substitui o rastreamento do Entrega Segura e não envia ETA ao aplicativo.** O mapa embutido continua no MapLibre; as previsões internas são calculadas somente com Mapbox quando configurado.
- Confira o destino antes de iniciar a navegação, especialmente quando o link usa endereço em texto e pode haver locais semelhantes.
