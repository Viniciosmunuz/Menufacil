import { Printer, UserPlus } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/panel/page-header";
import { SalaoAbas } from "@/components/panel/salao-abas";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { requireSalao } from "@/server/auth/dal";
import { ImpressoraDaSecao } from "@/components/panel/impressora-da-secao";
import { ImpressorasDoComputador } from "@/components/panel/impressoras-do-computador";
import { PermissoesDoGarcom } from "@/components/panel/permissoes-garcom";
import { listarGarcons } from "@/server/salao/garcons";

import { GarcomForm } from "../garcom-form";
import { QuantidadeForm } from "../quantidade-form";

export const metadata: Metadata = { title: "Configuração do salão" };

// A configuração do salão, nas mesmas abas que deslizam do mapa.
//
// É o mesmo gesto da tela anterior, e isso não é economia de código: quem
// aprendeu a arrastar para trocar de aba no salão não precisa aprender
// outra navegação duas telas depois. O padrão também aguenta crescer --
// taxa de serviço, impressão e horário entram como mais uma aba, sem
// redesenhar nada.

export default async function ConfiguracaoDoSalaoPage({ params }: PageProps<"/painel/[restaurantId]/salao/configuracao">) {
  const { restaurantId } = await params;
  const { restaurant, viaAdmin } = await requireSalao(restaurantId);

  const [mesas, balcoes, garcons, impressoras, secoes] = await Promise.all([
    db.mesa.count({ where: { restaurantId: restaurant.id, tipo: "MESA" } }),
    db.mesa.count({ where: { restaurantId: restaurant.id, tipo: "BALCAO" } }),
    listarGarcons(restaurant.id),
    // só as de comanda: a impressora de senha é do tablet do totem, e o
    // recibo do cliente é o pedido inteiro, não se divide
    db.printDevice.findMany({
      where: { restaurantId: restaurant.id, role: "COMANDA" },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, printerName: true },
    }),
    db.menuCategory.findMany({
      where: { restaurantId: restaurant.id, active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, printDeviceId: true },
    }),
  ]);

  const lugares = (
    <Card className="flex flex-col gap-6">
      <QuantidadeForm
        restaurantId={restaurant.id}
        tipo="MESA"
        atual={mesas}
        titulo="Mesas"
        descricao="Nascem numeradas de 1 em diante. Diminuir tira as últimas, e nunca uma que esteja com comanda aberta."
      />

      <div className="border-t border-line pt-6">
        <QuantidadeForm
          restaurantId={restaurant.id}
          tipo="BALCAO"
          atual={balcoes}
          titulo="Lugares de balcão"
          descricao="Quem senta no balcão abre comanda igual à mesa. Deixe em zero se o restaurante não tem balcão."
        />
      </div>
    </Card>
  );

  const equipe = (
    <Card className="flex flex-col gap-5">
      {garcons.length > 0 && (
        <ul className="flex flex-col divide-y divide-line">
          {garcons.map((g) => (
            <li key={g.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 first:pt-0">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{g.nome}</span>
                <span className="block truncate text-sm tabular-nums text-muted">{g.cpf}</span>
                {/* o nível só aparece escrito quando é o de cima: "Garçom"
                    embaixo do nome de um garçom não informa nada */}
                {g.nivel === "GARCOM_II" && <span className="block text-xs font-bold text-brand">Garçom II</span>}
              </span>
              <span className="shrink-0 text-sm text-faint">{g.ultimoAcesso ? `entrou ${formatWhen(g.ultimoAcesso)}` : "nunca entrou"}</span>
              <PermissoesDoGarcom restaurantId={restaurant.id} vinculoId={g.vinculoId} nome={g.nome} nivel={g.nivel} />
            </li>
          ))}
        </ul>
      )}

      <div className={garcons.length > 0 ? "border-t border-line pt-5" : ""}>
        <p className="mb-4 flex items-center gap-2 font-extrabold">
          <UserPlus className="size-5 text-brand" aria-hidden="true" />
          Novo garçom
        </p>
        <GarcomForm restaurantId={restaurant.id} />
      </div>
    </Card>
  );

  // De onde sai cada coisa. Com uma impressora só não há o que decidir, e a
  // tela diz isso em vez de oferecer uma escolha que não existe.
  const papel = (
    <Card className="flex flex-col gap-5">
      <div>
        <p className="flex items-center gap-2 font-extrabold">
          <Printer className="size-5 text-brand" aria-hidden="true" />
          De onde sai cada coisa
        </p>
        <p className="mt-1 text-sm text-muted">
          Com duas impressoras, a bebida pode sair no bar e o prato na cozinha. O que você não escolher continua saindo na
          impressora do balcão.
        </p>
      </div>

      {/* no Menu Fácil PC: a impressora do caixa e a chave para ligar as
          outras do mesmo computador. O admin vendo o painel de alguém não
          liga impressora na casa dele. */}
      {!viaAdmin && <ImpressorasDoComputador restaurantId={restaurant.id} />}

      {impressoras.length < 2 ? (
        <p className="rounded-control border border-line bg-surface-2 px-4 py-3 text-sm text-muted">
          {impressoras.length === 0
            ? "Nenhuma impressora ligada ainda. Abra o painel no Menu Fácil PC do computador do balcão: ele aparece aqui sozinho."
            : `Você tem uma impressora (${impressoras[0].printerName ?? impressoras[0].name}). Ligue a segunda para dividir o cardápio entre elas.`}
        </p>
      ) : secoes.length === 0 ? (
        <p className="text-sm text-muted">Seu cardápio ainda não tem seções.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {secoes.map((s) => (
            <ImpressoraDaSecao
              key={s.id}
              restaurantId={restaurant.id}
              categoriaId={s.id}
              nome={s.name}
              atual={s.printDeviceId}
              impressoras={impressoras.map((i) => ({ id: i.id, nome: i.printerName ?? i.name }))}
            />
          ))}
        </ul>
      )}
    </Card>
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Configuração do salão"
        description="Os lugares e quem atende."
        back={{ href: `/painel/${restaurant.id}/salao`, label: "Voltar ao salão" }}
      />

      <SalaoAbas
        abas={[
          { chave: "lugares", titulo: "Mesas e balcão", conteudo: lugares },
          { chave: "garcons", titulo: "Garçons", conteudo: equipe },
          { chave: "impressoras", titulo: "Impressoras", conteudo: papel },
        ]}
      />
    </div>
  );
}
