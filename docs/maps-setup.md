# Integração dos mapas — Entrega Segura

## Google Maps (mapa interno)

A interface já usa Google Maps JavaScript API e Routes Library quando encontra a variável `GOOGLE_MAPS_BROWSER_KEY`. Caso contrário, exibe um mapa de apoio baseado em MapLibre e OpenFreeMap, sem previsão de trânsito. O mapa mostra um marcador de moto e um marcador de destino. Quando o navegador do entregador compartilha GPS e existe um destino, a Routes Library retorna a linha de ruas, distância e tempo previsto de percurso.

1. Abra https://console.cloud.google.com/ e selecione o projeto Entrega Segura (ou crie um).
2. Vincule uma conta de faturamento, se exigido. Antes, configure alertas e cotas de API; alertas não bloqueiam cobranças.
3. Habilite **Maps JavaScript API**, **Routes API** e **Geocoding API** em APIs & Services → Library.
4. APIs & Services → Credentials → Create credentials → API key.
5. Defina **Application restrictions: Websites** e inclua:
   - `https://entrega-segura2.miguellpitaa.workers.dev/*`
   - `https://entregasegura.miguelpita.com.br/*` quando o domínio estiver vinculado ao Worker
6. Em API restrictions, permita somente as APIs Maps JavaScript, Routes e Geocoding.
7. Cloudflare → Workers & Pages → `entrega-segura2` → Settings → Variables and Secrets → Add → `GOOGLE_MAPS_BROWSER_KEY`. Cole a chave, salve e publique uma versão com a variável.

Não envie a chave no chat, nem no GitHub. A chave de navegador fica visível no JavaScript e deve ser restrita pelo próprio Google.

## Resultados esperados

- **Sem chave:** MapLibre/OpenFreeMap para visualização, simulação ilustrativa, botões Google Maps/Apple Maps que abrem navegação externa; ETA real indisponível.
- **Com chave e APIs habilitadas:** Google Maps como base, mapa ajustado ao motoboy e destino, linha pelo sistema viário e estimativas pela Routes Library.
- **GPS real:** posição só é recebida após permissão do entregador; o navegador precisa continuar ativo para atualizar a viagem.
- **Posição desatualizada:** o sistema deixa de apresentar rastreamento como ativo quando a posição ultrapassa a janela de validade.
- **Destino em texto:** Geocoder JavaScript converte endereço em coordenadas. Para uma entrega real, informe endereço completo com número, bairro e cidade; coordenadas confirmadas pelo consumidor são preferíveis.
- **Rotas de moto:** por padrão, utiliza DRIVING como referência de trânsito. Roteamento TWO_WHEELER tem limitações de disponibilidade, custo maior e avisos especiais; só habilitar após avaliação.
- **iPhone:** botão Apple Maps abre a navegação externa diretamente, sem chave. MapKit JS embarcado é uma integração futura independente.

## Segurança e limites

A página de simulação é fictícia e não deve ser confundida com rastreamento de pessoas reais. Os links de acompanhamento têm acesso à entrega específica. A localização só deve ser compartilhada durante a entrega ativa e com consentimento. Para produção, é necessário autenticação forte de entregadores, políticas LGPD, limites por IP, revogação de links e rastreamento nativo em segundo plano.

## Teste pelo celular

1. Acesse `/demo`, selecione Entregador e inicie viagem. Confira mapa, marcador de moto, destino e mudança de posição; sem chave, tempo/distância são ilustrativos.
2. Abra Consumidor no mesmo navegador para acompanhar a simulação.
3. Para testar em dois aparelhos, acesse `/laboratorio`; inicie uma sessão fictícia do Neon, crie pedido e compartilhe os links individuais. O Worker precisa da secret `DATABASE_URL` do banco Neon `entrega_segura`.
4. Para rastreamento real, use os links por pedido no painel autenticado e autorize localização no navegador do entregador.
