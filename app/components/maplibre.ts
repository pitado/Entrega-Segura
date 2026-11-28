"use client";

// O MapLibre 6 procura o arquivo do worker ao lado do próprio módulo, o que não existe depois do bundle do Next.
// Aqui o webpack copia o worker como arquivo estático e informamos a URL antes de criar o mapa.
let configured = false;
export async function loadMaplibre() {
  const lib = await import("maplibre-gl");
  if (!configured) {
    lib.setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());
    configured = true;
  }
  return lib;
}
