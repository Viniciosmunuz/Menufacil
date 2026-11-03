import "server-only";

import { db } from "@/lib/db";

// O endereço do cliente virando coordenadas.
//
// O pedido guarda o endereço como a pessoa digitou -- "Rua das Flores,
// 120, Centro". Mapa não entende isso; mapa entende dois números. Quem
// traduz é o Nominatim, o serviço de busca do próprio OpenStreetMap: de
// graça, sem chave, e é o mesmo mapa que a gente já desenha.
//
// Duas regras que o serviço pede e que estão respeitadas aqui:
//
// - um pedido por segundo, no máximo. Como a tradução acontece uma vez por
//   pedido, na hora em que alguém abre o mapa, isso nunca chega perto.
// - dizer quem está chamando. Vai no User-Agent, com o domínio do sistema.
//
// Se não achar, não insiste: grava a tentativa e o mapa mostra só a moto,
// sem o alfinete do destino. Endereço de interior sai errado com
// frequência, e um alfinete no lugar errado é pior do que alfinete nenhum.

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

type Endereco = {
  deliveryStreet: string | null;
  deliveryNumber: string | null;
  deliveryNeighborhood: string | null;
};

/** o endereço do jeito que o serviço de busca entende melhor */
function consulta(endereco: Endereco, cidade: string | null, estado: string | null) {
  const rua = [endereco.deliveryStreet, endereco.deliveryNumber].filter(Boolean).join(", ");
  return [rua, endereco.deliveryNeighborhood, cidade, estado, "Brasil"].filter(Boolean).join(", ");
}

async function procurar(texto: string): Promise<{ lat: number; lng: number } | null> {
  const url = `${NOMINATIM}?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(texto)}`;
  const resposta = await fetch(url, {
    headers: {
      "User-Agent": "MenuFacil/1.0 (https://menufacildelivery.com.br)",
      "Accept-Language": "pt-BR",
    },
    // a entrega não pode esperar um serviço de fora: oito segundos e desiste
    signal: AbortSignal.timeout(8000),
  });
  if (!resposta.ok) return null;

  const achados = (await resposta.json()) as { lat?: string; lon?: string }[];
  const primeiro = achados?.[0];
  if (!primeiro?.lat || !primeiro?.lon) return null;

  const lat = Number(primeiro.lat);
  const lng = Number(primeiro.lon);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

/**
 * As coordenadas do destino deste pedido, traduzindo na primeira vez.
 *
 * Nunca lança: mapa é conforto, não é a entrega. Se o serviço estiver fora
 * do ar, o entregador continua com o endereço escrito e o botão que abre o
 * Google Maps dele.
 */
export async function destinoDoPedido(pedido: {
  id: string;
  destinoLat: number | null;
  destinoLng: number | null;
  destinoEm: Date | null;
  deliveryStreet: string | null;
  deliveryNumber: string | null;
  deliveryNeighborhood: string | null;
  restaurant: { city: string | null; state?: string | null };
}): Promise<{ lat: number; lng: number } | null> {
  if (pedido.destinoLat != null && pedido.destinoLng != null) return { lat: pedido.destinoLat, lng: pedido.destinoLng };
  // já tentou e não achou: não bate de novo no serviço a cada abertura
  if (pedido.destinoEm) return null;
  if (!pedido.deliveryStreet) return null;

  try {
    const achado = await procurar(consulta(pedido, pedido.restaurant.city, pedido.restaurant.state ?? null));
    await db.order.update({
      where: { id: pedido.id },
      data: { destinoLat: achado?.lat ?? null, destinoLng: achado?.lng ?? null, destinoEm: new Date() },
    });
    return achado;
  } catch {
    // serviço fora do ar ou demorado: fica para a próxima abertura
    return null;
  }
}
