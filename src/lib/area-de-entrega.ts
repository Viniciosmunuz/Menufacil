/**
 * O casamento do bairro do pedido com a área de entrega.
 *
 * Mora aqui, fora do arquivo que cria o pedido, para poder ser testado
 * sozinho: é ele quem decide a taxa cobrada e se a entrega é aceita, e
 * não depende de banco nem de servidor -- só de texto.
 */

/**
 * Em que área de entrega cai este bairro.
 *
 * Casa pelo nome da área **ou** por qualquer apelido dela. O apelido
 * existe porque nem todo lugar atendido é um bairro: na BR-174 o
 * restaurante entrega no Hotel Calleb e na fábrica de gelo, e não na
 * rodovia inteira. Quem diz "estou no Hotel Calleb" tem de cair na
 * mesma taxa de quem diz "BR-174 km 107" -- é o mesmo lugar.
 *
 * Serve igual para o bairro escrito de outro jeito: "cohab 2" e
 * "Cohab II" eram dois bairros diferentes para o sistema, e o segundo
 * jeito de escrever levava o pedido a ser recusado sem explicação.
 */
export function areaDoPedido<T extends { name: string; apelidos?: string[] }>(
  areas: T[],
  bairro: string | null | undefined,
) {
  if (!bairro) return null;
  const limpo = chave(bairro);
  return (
    areas.find(
      (a) => chave(a.name) === limpo || (a.apelidos ?? []).some((ap) => chave(ap) === limpo),
    ) ?? null
  );
}

/** o nome reduzido ao que importa: sem acento, sem pontuação, minúsculo */
export const chave = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
