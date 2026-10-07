import { UserPlus } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader, SectionTitle } from "@/components/panel/page-header";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { requireSalao } from "@/server/auth/dal";
import { listarGarcons } from "@/server/salao/garcons";

import { GarcomForm } from "../garcom-form";
import { QuantidadeForm } from "../quantidade-form";

export const metadata: Metadata = { title: "Configuração do salão" };

export default async function ConfiguracaoDoSalaoPage({ params }: PageProps<"/painel/[restaurantId]/salao/configuracao">) {
  const { restaurantId } = await params;
  const { restaurant } = await requireSalao(restaurantId);

  const [mesas, balcoes, garcons] = await Promise.all([
    db.mesa.count({ where: { restaurantId: restaurant.id, tipo: "MESA" } }),
    db.mesa.count({ where: { restaurantId: restaurant.id, tipo: "BALCAO" } }),
    listarGarcons(restaurant.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configuração do salão"
        description="Os lugares e quem atende."
        back={{ href: `/painel/${restaurant.id}/salao`, label: "Voltar ao salão" }}
      />

      <Card className="flex flex-col gap-6">
        <SectionTitle description="Diga quantos lugares o salão tem. Eles nascem numerados de 1 em diante.">Mesas e balcão</SectionTitle>

        <QuantidadeForm
          restaurantId={restaurant.id}
          tipo="MESA"
          atual={mesas}
          titulo="Mesas"
          descricao="Diminuir tira as últimas, e nunca uma que esteja com comanda aberta."
        />

        <div className="border-t border-line pt-6">
          <QuantidadeForm
            restaurantId={restaurant.id}
            tipo="BALCAO"
            atual={balcoes}
            titulo="Lugares de balcão"
            descricao="Quem senta no balcão abre comanda igual à mesa. Deixe em zero se não tem balcão."
          />
        </div>
      </Card>

      <Card className="flex flex-col gap-5">
        <SectionTitle description="Cada garçom entra pelo mesmo endereço do painel, com o usuário e a senha que você definir aqui.">
          Garçons
        </SectionTitle>

        {garcons.length > 0 && (
          <ul className="flex flex-col divide-y divide-line">
            {garcons.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 first:pt-0">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{g.nome}</span>
                  <span className="block truncate text-sm text-muted tabular-nums">{g.cpf}</span>
                </span>
                <span className="shrink-0 text-sm text-faint">
                  {g.ultimoAcesso ? `entrou ${formatWhen(g.ultimoAcesso)}` : "nunca entrou"}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-line pt-5">
          <p className="mb-4 flex items-center gap-2 font-extrabold">
            <UserPlus className="size-5 text-brand" aria-hidden="true" />
            Novo garçom
          </p>
          <GarcomForm restaurantId={restaurant.id} />
        </div>
      </Card>
    </div>
  );
}
