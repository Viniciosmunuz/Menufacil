import { Bike, CreditCard, Phone } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BotaoSair } from "@/components/panel/botao-sair";
import { EntregadorNav } from "@/components/panel/entregador-nav";
import { PushAvisos } from "@/components/panel/push-avisos";
import { formatPhone } from "@/lib/format";
import { requireEntregador } from "@/server/auth/dal";
import { chavePublicaDePush } from "@/server/push/avisos";

import { desligarAvisosDoEntregador, ligarAvisosDoEntregador, testarAvisosDoEntregador } from "../acoes";
import { Faixa } from "../componentes";
import { ChaveDeDisponibilidade } from "../disponibilidade";

export const metadata: Metadata = { title: "Configurações" };

// A conta aberta neste aparelho.
//
// O entregador não edita o próprio cadastro: quem muda nome, telefone,
// moto e placa é o restaurante, no painel. Aqui ele confere o que está
// cadastrado, liga o aviso e sai da conta -- se algo estiver errado, quem
// corrige é quem cadastrou.

/** uma linha de dado, com o ícone na frente */
function Linha({ icone: Icone, rotulo, valor }: { icone: typeof Phone; rotulo: string; valor: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icone className="size-5 shrink-0 text-brand" aria-hidden="true" />
      <span className="min-w-0 flex-1 text-sm text-muted">{rotulo}</span>
      <span className="shrink-0 font-bold tabular-nums">{valor}</span>
    </div>
  );
}

export default async function ConfiguracoesPage({ params }: PageProps<"/entregador/[restaurantId]/configuracoes">) {
  const { restaurantId } = await params;
  const { entregador, restaurant, user } = await requireEntregador();
  if (restaurantId !== restaurant.id) notFound();
  const base = `/entregador/${restaurant.id}`;

  // o login é o telefone; o endereço interno da conta não interessa a ele
  const telefone = user.email.split("@")[0];

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-4">
      <Faixa titulo="Configurações" alta />

      <div className="flex flex-col gap-4 pb-6">
        {/* o retrato sobe por cima da faixa */}
        <div className="-mt-14 flex items-end gap-4">
          {entregador.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- retrato pequeno, já recortado no envio
            <img src={entregador.fotoUrl} alt="" className="size-24 shrink-0 rounded-full object-cover ring-4 ring-bg" />
          ) : (
            <span className="grid size-24 shrink-0 place-items-center rounded-full bg-surface-3 text-muted ring-4 ring-bg">
              <Bike className="size-10" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0 pb-1">
            <p className="text-xl font-extrabold">{entregador.nome}</p>
            <p className="text-sm text-muted">Entregador · {restaurant.name}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-bg p-4 shadow-md shadow-black/5">
          <div className="min-w-0">
            <p className="font-extrabold">Meu status</p>
            <p className="text-sm text-muted">É daqui que o balcão sabe se pode mandar pedido.</p>
          </div>
          <ChaveDeDisponibilidade atual={entregador.disponibilidade} />
        </div>

        {/* o celular apita quando a entrega é dele -- e não a cada pedido
            que entra na cozinha, que é o aviso do balcão */}
        <PushAvisos
          restaurantId={restaurant.id}
          chavePublica={chavePublicaDePush()}
          escopo="/entregador/"
          discreto
          texto={{
            ligado: "Entrega nova apita neste celular.",
            desligado: "Entrega nova apita mesmo com a tela apagada.",
          }}
          ligarAction={ligarAvisosDoEntregador}
          desligarAction={desligarAvisosDoEntregador}
          testarAction={testarAvisosDoEntregador}
        />

        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-bg shadow-md shadow-black/5">
          <Linha icone={Phone} rotulo="Telefone (é com ele que você entra)" valor={formatPhone(telefone)} />
          <Linha icone={Bike} rotulo="Moto" valor={entregador.moto || "—"} />
          <Linha icone={CreditCard} rotulo="Placa" valor={entregador.placa || "—"} />
        </div>

        <p className="text-sm text-muted">
          Para corrigir seu nome, telefone, moto ou placa, fale com o {restaurant.name} — quem muda esses dados é o restaurante, no painel
          dele.
        </p>

        <BotaoSair nome={entregador.nome.split(" ")[0]} volta="o seu telefone e a sua senha" />
      </div>

      <EntregadorNav base={base} />
    </main>
  );
}
