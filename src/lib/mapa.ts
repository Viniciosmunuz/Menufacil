// O mapa escuro, usado nos dois lados: na tela do cliente e na do
// entregador.
//
// Escuro porque entrega é coisa de noite: o cardápio abre às 18h e a moto
// sai no escuro. Um mapa branco no meio da tela do celular, de noite, cega
// quem olha -- e é justamente o entregador, de capacete, parado no farol,
// que não pode levar um flash na cara.
//
// Os ladrilhos continuam sendo os do OpenStreetMap, que são livres e não
// pedem chave. O escuro é feito aqui, invertendo a cor **só da camada dos
// ladrilhos** (ver `.mapa-escuro` em globals.css): os alfinetes e a linha
// ficam de fora da inversão e mantêm as cores de verdade.
//
// O caminho mais bonito seria o mapa escuro pronto do CARTO -- mas ele
// passou a exigir chave de API, e os ladrilhos voltam carimbados com
// "API KEY REQUIRED". Testado em 03/11/2026; se um dia houver chave, é
// trocar a URL aqui e tirar a classe.

export const LADRILHOS = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const ATRIBUICAO = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** as cores dos alfinetes, pensadas para ler sobre o mapa escuro */
export const COR_DA_MOTO = "#22c55e";
export const COR_DO_DESTINO = "#f9680b";
