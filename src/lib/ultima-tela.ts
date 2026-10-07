// A última seção do painel em que a pessoa estava.
//
// Serve para o atalho da tela inicial devolver o dono onde ele parou. Quem
// passa a noite na aba Pedidos quer voltar em Pedidos; cair no Início toda
// vez é um toque a mais em hora de movimento.
//
// É um cookie, e não localStorage, porque quem decide o destino é o
// servidor, em `/painel`: lido lá, o redirecionamento acontece antes de a
// tela desenhar, sem o pisca-pisca de ir para uma página e pular para
// outra. Quem grava é o navegador, no painel -- escrever cookie no desenho
// de uma página o Next não permite.

export const COOKIE_DA_TELA = "mf_ultima_tela";

/** trinta dias, como a sessão: o cookie não sobrevive a quem o criou */
export const DIAS_DA_TELA = 30;

/**
 * Para onde mandar quem abriu o painel sem dizer a tela.
 *
 * Guarda-se a seção, nunca o endereço inteiro. "/painel/x/pedidos/abc123"
 * vira "/painel/x/pedidos": o pedido de ontem pode ter sido concluído e a
 * mesa pode ter sido apagada, e devolver alguém a uma página que não existe
 * mais é pior do que devolvê-lo ao Início.
 *
 * Tela de outro restaurante é descartada: o cookie é um só, e quem cuida de
 * dois restaurantes não pode cair no errado.
 */
export function telaDeVolta(ultima: string | undefined, restaurantId: string): string {
  const base = `/painel/${restaurantId}`;
  if (!ultima) return base;

  let caminho: string;
  try {
    caminho = decodeURIComponent(ultima);
  } catch {
    return base;
  }

  if (caminho !== base && !caminho.startsWith(`${base}/`)) return base;

  const secao = caminho.slice(base.length).split("/")[1];
  // só o nome de uma seção, nada que carregue id, parâmetro ou caminho
  if (!secao || !/^[a-z-]{1,40}$/.test(secao)) return base;

  return `${base}/${secao}`;
}
