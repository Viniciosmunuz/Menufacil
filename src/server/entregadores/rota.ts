import "server-only";

// A rota pelas ruas, e quanto falta para chegar.
//
// Quem traça é o OpenRouteService, que é o serviço de rotas em cima do
// mesmo OpenStreetMap que a gente desenha. O plano gratuito dá 2.000 rotas
// por dia, e cada entrega pede a rota de vez em quando -- não de segundo em
// segundo (ver o acelerador no lado do navegador).
//
// A chave fica no servidor, nunca no navegador: por isso o mapa pergunta à
// nossa própria /api/rota, e é ela que fala com o serviço de fora.
//
// Sem chave, devolve nada -- e o mapa cai na linha reta, que é como estava
// antes. O recurso nasce desligado e se liga sozinho quando a chave entra.

const ORS = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";

export type Rota = {
  /** o caminho desenhado, em [latitude, longitude] */
  caminho: [number, number][];
  /** quanto falta, em segundos e em metros */
  segundos: number;
  metros: number;
};

type Resposta = {
  features?: {
    geometry?: { coordinates?: [number, number][] };
    properties?: { summary?: { duration?: number; distance?: number } };
  }[];
};

export const temRotaConfigurada = () => !!process.env.ORS_API_KEY;

export async function tracarRota(
  de: { lat: number; lng: number },
  para: { lat: number; lng: number },
): Promise<Rota | null> {
  const chave = process.env.ORS_API_KEY;
  if (!chave) return null;

  try {
    const resposta = await fetch(ORS, {
      method: "POST",
      headers: { Authorization: chave, "Content-Type": "application/json" },
      // o serviço fala em [longitude, latitude], ao contrário de todo o
      // resto do nosso código -- é a ordem do GeoJSON
      body: JSON.stringify({ coordinates: [[de.lng, de.lat], [para.lng, para.lat]] }),
      // a entrega não espera serviço de fora: oito segundos e desiste
      signal: AbortSignal.timeout(8000),
    });
    if (!resposta.ok) return null;

    const dados = (await resposta.json()) as Resposta;
    const trecho = dados.features?.[0];
    const pontos = trecho?.geometry?.coordinates;
    const resumo = trecho?.properties?.summary;
    if (!pontos?.length || !resumo?.duration) return null;

    return {
      caminho: pontos.map(([lng, lat]) => [lat, lng] as [number, number]),
      segundos: Math.round(resumo.duration),
      metros: Math.round(resumo.distance ?? 0),
    };
  } catch {
    // serviço fora do ar, lento ou sem cota: fica a linha reta
    return null;
  }
}

/** "8 min", "1 h 05", para a tela */
export function tempoEmPalavras(segundos: number) {
  const minutos = Math.max(1, Math.round(segundos / 60));
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return `${horas} h ${String(minutos % 60).padStart(2, "0")}`;
}
