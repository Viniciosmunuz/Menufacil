import "server-only";

import { db } from "@/lib/db";

/**
 * Copia o cardápio inteiro de um restaurante para outro.
 *
 * Nasceu para pôr o cardápio do Papaléguas num restaurante de teste,
 * mas o uso que importa é o próximo: todo restaurante novo que entra
 * parecido com um que já está dentro -- a mesma franquia, a mesma dona
 * com a segunda loja, o mesmo cardápio de lanchonete de bairro --
 * começa do zero digitando item por item. É o trabalho que mais atrasa
 * uma ativação, e é o único que dá para fazer com um clique.
 *
 * **O que não vem junto, e por quê.**
 *
 * A impressora da categoria fica de fora. `printDeviceId` aponta para
 * um aparelho cadastrado no restaurante de origem; copiar o id mandaria
 * a comanda do novo restaurante para a cozinha do outro. Quem clona
 * escolhe a impressora depois, na tela de impressão.
 *
 * As fotos vêm, mas por referência: `imageUrl` aponta para o mesmo
 * arquivo no Blob. Os dois cardápios passam a mostrar a mesma imagem,
 * e trocar a foto de um não mexe no outro -- o que muda é o endereço
 * guardado, não o arquivo. Apagar o restaurante de origem também não
 * derruba as fotos daqui: o Blob não é apagado junto.
 */

export type ResultadoDaClonagem = {
  categorias: number;
  produtos: number;
  grupos: number;
  opcoes: number;
};

/** O que existe no cardápio de um restaurante, para mostrar antes de clonar. */
export async function tamanhoDoCardapio(restaurantId: string) {
  const [categorias, produtos] = await Promise.all([
    db.menuCategory.count({ where: { restaurantId } }),
    db.product.count({ where: { restaurantId } }),
  ]);
  return { categorias, produtos };
}

/**
 * Clona o cardápio de `origemId` para `destinoId`.
 *
 * `substituir` apaga o cardápio do destino antes de copiar. Sem ele, o
 * que já existe fica e o novo entra junto -- que é o certo para quem
 * quer somar, e errado para quem quer o cardápio idêntico ao da origem.
 *
 * Tudo numa transação só: um cardápio metade copiado é pior que nenhum,
 * porque esconde o erro atrás de uma tela que parece preenchida.
 */
export async function clonarCardapio(params: {
  origemId: string;
  destinoId: string;
  substituir: boolean;
}): Promise<ResultadoDaClonagem> {
  const { origemId, destinoId, substituir } = params;
  if (origemId === destinoId) throw new Error("A origem e o destino são o mesmo restaurante.");

  const categorias = await db.menuCategory.findMany({
    where: { restaurantId: origemId },
    orderBy: { sortOrder: "asc" },
    include: {
      products: {
        orderBy: { sortOrder: "asc" },
        include: {
          optionGroups: {
            orderBy: { sortOrder: "asc" },
            include: { options: { orderBy: { sortOrder: "asc" } } },
          },
        },
      },
    },
  });

  if (categorias.length === 0) throw new Error("O restaurante de origem não tem cardápio para copiar.");

  return db.$transaction(async (tx) => {
    if (substituir) {
      // As categorias levam os produtos, os grupos e as opções junto, em
      // cascata. Pedido antigo não se perde: o OrderItem guarda nome e
      // preço do que foi vendido, e só perde a referência ao produto.
      await tx.menuCategory.deleteMany({ where: { restaurantId: destinoId } });
    }

    const contagem: ResultadoDaClonagem = { categorias: 0, produtos: 0, grupos: 0, opcoes: 0 };
    // de que opção antiga saiu cada opção nova: é o que conserta o meio
    // a meio na segunda passada
    const opcaoNova = new Map<string, string>();
    // os grupos que apontam para uma opção de outro grupo, para visitar
    // depois que todas as opções existirem
    const meioAMeio: { grupoNovo: string; opcaoAntiga: string }[] = [];

    for (const categoria of categorias) {
      const criada = await tx.menuCategory.create({
        data: {
          restaurantId: destinoId,
          name: categoria.name,
          description: categoria.description,
          sortOrder: categoria.sortOrder,
          active: categoria.active,
          somenteSalao: categoria.somenteSalao,
          pizzaFlavors: categoria.pizzaFlavors,
          addons: categoria.addons,
          // a impressora é do outro restaurante; ver o cabeçalho
          printDeviceId: null,
        },
      });
      contagem.categorias++;

      for (const produto of categoria.products) {
        const prod = await tx.product.create({
          data: {
            restaurantId: destinoId,
            categoryId: criada.id,
            name: produto.name,
            description: produto.description,
            imageUrl: produto.imageUrl,
            priceCents: produto.priceCents,
            promoPriceCents: produto.promoPriceCents,
            available: produto.available,
            featured: produto.featured,
            sortOrder: produto.sortOrder,
            pizzaFlavors: produto.pizzaFlavors,
            allowAddons: produto.allowAddons,
          },
        });
        contagem.produtos++;

        for (const grupo of produto.optionGroups) {
          const grp = await tx.productOptionGroup.create({
            data: {
              productId: prod.id,
              name: grupo.name,
              minSelect: grupo.minSelect,
              maxSelect: grupo.maxSelect,
              sortOrder: grupo.sortOrder,
              halfHalf: grupo.halfHalf,
              // fica para a segunda passada: a opção a que ele se refere
              // pode estar num grupo que ainda não foi criado
              halfFromOptionId: null,
            },
          });
          contagem.grupos++;
          if (grupo.halfFromOptionId) {
            meioAMeio.push({ grupoNovo: grp.id, opcaoAntiga: grupo.halfFromOptionId });
          }

          for (const opcao of grupo.options) {
            const op = await tx.productOption.create({
              data: {
                groupId: grp.id,
                name: opcao.name,
                priceCents: opcao.priceCents,
                available: opcao.available,
                sortOrder: opcao.sortOrder,
              },
            });
            opcaoNova.set(opcao.id, op.id);
            contagem.opcoes++;
          }
        }
      }
    }

    // **A segunda passada, que é o que faz o meio a meio continuar
    // funcionando.**
    //
    // `halfFromOptionId` é a opção a partir da qual o meio a meio passa
    // a valer -- por exemplo, pizza de tamanho "Grande" para cima. Ela
    // mora em OUTRO grupo do mesmo produto, e o id copiado sem traduzir
    // continuaria apontando para a opção do restaurante de origem:
    // funcionaria na tela, calcularia errado na conta, e ninguém
    // descobriria até a primeira pizza meio a meio sair pelo preço
    // errado.
    for (const { grupoNovo, opcaoAntiga } of meioAMeio) {
      const nova = opcaoNova.get(opcaoAntiga);
      if (!nova) continue;
      await tx.productOptionGroup.update({
        where: { id: grupoNovo },
        data: { halfFromOptionId: nova },
      });
    }

    return contagem;
  });
}
