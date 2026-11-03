import { Bike } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EntregadorNav } from "@/components/panel/entregador-nav";
import { PushAvisos } from "@/components/panel/push-avisos";
import { formatPhone } from "@/lib/format";
import { requireEntregador } from "@/server/auth/dal";
import { chavePublicaDePush } from "@/server/push/avisos";

import { BotaoSair } from "@/components/panel/botao-sair";
import { desligarAvisosDoEntregador, ligarAvisosDoEntregador, testarAvisosDoEntregador } from "../acoes";
import { ChaveDeDisponibilidade } from "../disponibilidade";
import { Topo } from "../componentes";

export const metadata: Metadata = { title: "Meu perfil" };

// A conta aberta neste aparelho.
//
// O entregador não edita o próprio cadastro: quem muda nome, telefone,
// moto e placa é o restaurante, no painel. Aqui ele confere o que está
// cadastrado e sai da conta -- se algo estiver errado, quem corrige é
// quem cadastrou.

export default async function PerfilPage({ params }: PageProps<"/entregador/[restaurantId]/perfil">) {
  const { restaurantId } = await params;
  const { entregador, restaurant, user } = await requireEntregador();
  if (restaurantId !== restaurant.id) notFound();
  const base = `/entregador/${restaurant.id}`;

  // o login é o telefone; o endereço interno da conta não interessa a ele
  const telefone = user.email.split("@")[0];

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-4">
      <Topo titulo="Meu perfil" />

      <div className="flex flex-col gap-6 pb-6">
        <div className="flex items-center gap-4 rounded-card border border-line bg-surface p-4">
          {entregador.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- retrato pequeno, já recortado no envio
            <img src={entregador.fotoUrl} alt="" className="size-16 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="grid size-16 shrink-0 place-items-center rounded-full bg-surface-3 text-muted">
              <Bike className="size-7" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-lg font-extrabold">{entregador.nome}</p>
            <p className="text-sm text-muted">Entregador · {restaurant.name}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface p-4">
          <div>
            <p className="font-bold">Meu status</p>
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

        <dl className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Telefone (é com ele que você entra)</dt>
            <dd className="font-bold tabular-nums">{formatPhone(telefone)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Moto</dt>
            <dd className="font-bold">{entregador.moto || "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Placa</dt>
            <dd className="font-bold">{entregador.placa || "—"}</dd>
          </div>
        </dl>

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
