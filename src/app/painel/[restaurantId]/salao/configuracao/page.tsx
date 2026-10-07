import { UserPlus } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/panel/page-header";
import { SalaoAbas } from "@/components/panel/salao-abas";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { requireSalao } from "@/server/auth/dal";
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
  const { restaurant } = await requireSalao(restaurantId);

  const [mesas, balcoes, garcons] = await Promise.all([
    db.mesa.count({ where: { restaurantId: restaurant.id, tipo: "MESA" } }),
    db.mesa.count({ where: { restaurantId: restaurant.id, tipo: "BALCAO" } }),
    listarGarcons(restaurant.id),
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
                {/* o que ele pode fazer além de lançar e receber; sem nada
                    marcado, a linha some em vez de dizer "nenhuma" */}
                {(g.podeExcluirItem || g.podeFinalizarMesa) && (
                  <span className="block text-xs text-brand">
                    {[g.podeExcluirItem && "apaga item", g.podeFinalizarMesa && "finaliza mesa"].filter(Boolean).join(" · ")}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-sm text-faint">{g.ultimoAcesso ? `entrou ${formatWhen(g.ultimoAcesso)}` : "nunca entrou"}</span>
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
        ]}
      />
    </div>
  );
}
