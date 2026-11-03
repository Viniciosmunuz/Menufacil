import { Bike, CircleSlash, Info, PauseCircle, Smartphone, UserPlus, Users } from "lucide-react";
import type { Metadata } from "next";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Gaveta } from "@/components/ui/gaveta";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import { formatDateTime, formatPhone } from "@/lib/format";
import { appUrl } from "@/lib/site";
import { requireEntregadores } from "@/server/auth/dal";
import { contarEntregadores, pedidosEmRota, quadroDeEntregas, type EntregadorNaTela } from "@/server/entregadores/lista";

import { alternarEntregador } from "./actions";
import { PedidosEmRota } from "./em-rota";
import { EditarEntregador, NovoEntregador, TrocarSenha } from "./forms";

export const metadata: Metadata = { title: "Entregadores" };

// A equipe que leva os pedidos.
//
// A tela responde primeiro à pergunta do movimento -- "tem quem pegue
// agora?" -- e só depois ao cadastro. Por isso os números vêm em cima, a
// lista no meio com o estado de cada um, e o formulário de cadastrar fica
// numa gaveta fechada: cadastrar entregador é coisa de uma vez, e olhar
// quem está na rua é coisa de toda noite.

/** o que o entregador está fazendo agora, numa palavra */
function estado(e: EntregadorNaTela) {
  if (!e.ativo) return { texto: "Desligado", tone: "neutral" as const, bolinha: "bg-line-strong" };
  if (e.emRota > 0) return { texto: e.emRota === 1 ? "Em entrega" : `${e.emRota} entregas`, tone: "info" as const, bolinha: "bg-info" };
  if (e.disponibilidade === "DISPONIVEL") return { texto: "Disponível", tone: "success" as const, bolinha: "bg-success" };
  if (e.disponibilidade === "PAUSA") return { texto: "Em pausa", tone: "warning" as const, bolinha: "bg-warning" };
  return { texto: "Fora do ar", tone: "neutral" as const, bolinha: "bg-line-strong" };
}

/** um dos quatro números do topo */
function Numero({
  rotulo,
  valor,
  icone: Icone,
  tom,
}: {
  rotulo: string;
  valor: number;
  icone: typeof Users;
  tom: "brand" | "success" | "info" | "neutral";
}) {
  const cores = {
    brand: "bg-brand-soft text-brand",
    success: "bg-success/12 text-success",
    info: "bg-info/12 text-info",
    neutral: "bg-surface-3 text-muted",
  } as const;

  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 sm:p-5">
      <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl [&_svg]:size-6", cores[tom])}>
        <Icone aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-muted">{rotulo}</span>
        <span className="block text-3xl font-extrabold tabular-nums">{valor}</span>
      </span>
    </div>
  );
}

export default async function EntregadoresPage({ params }: PageProps<"/painel/[restaurantId]/entregadores">) {
  const { restaurantId } = await params;
  const acesso = await requireEntregadores(restaurantId);
  const [{ entregadores, semEntregador }, emRota] = await Promise.all([
    quadroDeEntregas(acesso.restaurant.id),
    pedidosEmRota(acesso.restaurant.id),
  ]);
  const { total, disponiveis, emEntrega, inativos } = contarEntregadores(entregadores);
  const entrada = `${appUrl()}/entrar`;

  return (
    <div className="flex flex-col gap-6">
      {/* A faixa do topo, com a arte do entregador: a seção se apresenta
          com a cara do módulo, e não com um título solto. No celular a
          moto sai -- ali a largura é toda do texto. */}
      <header className="relative flex items-center gap-5 overflow-hidden rounded-card bg-gradient-to-r from-brand-soft via-surface-2 to-surface px-5 py-6 sm:px-8 sm:py-7">
        {/* eslint-disable-next-line @next/next/no-img-element -- arte fixa da seção, sem transformação */}
        <img src="/app/entregador-scooter.png" alt="" aria-hidden="true" className="hidden h-24 w-auto shrink-0 sm:block lg:h-28" />
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Entregadores</h1>
          <p className="mt-1.5 max-w-xl text-muted">
            Gerencie os entregadores do seu restaurante. Cada um entra no celular com o próprio telefone e confirma a entrega por lá.
          </p>
        </div>
      </header>

      {/* O aviso vem antes dos números: pedido parado sem quem leve é a
          única coisa desta tela que pede ação agora. */}
      {semEntregador > 0 && (
        <Alert tone="warning">
          {semEntregador === 1
            ? "Um pedido saiu para entrega e ainda não tem entregador."
            : `${semEntregador} pedidos saíram para entrega e ainda não têm entregador.`}
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero rotulo="Cadastrados" valor={total} icone={Users} tom="brand" />
        <Numero rotulo="Disponíveis agora" valor={disponiveis} icone={Bike} tom="success" />
        <Numero rotulo="Em entrega" valor={emEntrega} icone={PauseCircle} tom="info" />
        <Numero rotulo="Desligados" valor={inativos} icone={CircleSlash} tom="neutral" />
      </div>

      <PedidosEmRota
        pedidos={emRota}
        equipe={entregadores.filter((e) => e.ativo).map((e) => ({ id: e.id, nome: e.nome }))}
        restaurantId={acesso.restaurant.id}
        base={`/painel/${acesso.restaurant.id}/pedidos`}
      />

      {entregadores.length === 0 ? (
        <EmptyState icon={<Bike />} title="Nenhum entregador ainda">
          Cadastre quem leva seus pedidos. Ele recebe um telefone e uma senha, entra pelo celular e passa a confirmar a entrega por lá — o
          balcão deixa de fazer isso no lugar dele.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {entregadores.map((e) => {
            const como = estado(e);
            return (
              <li key={e.id}>
                <Gaveta
                  titulo={e.nome}
                  resumo={[formatPhone(e.telefone), e.moto, e.placa].filter(Boolean).join(" · ")}
                  icone={
                    // a foto com a bolinha do estado: de longe, a lista
                    // inteira se lê pelas bolinhas
                    <span className="relative block size-11">
                      {e.fotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- retrato pequeno, já recortado no envio
                        <img src={e.fotoUrl} alt="" className="size-11 rounded-full object-cover" />
                      ) : (
                        <span className="grid size-11 place-items-center rounded-full bg-surface-3 text-muted">
                          <Bike className="size-5" aria-hidden="true" />
                        </span>
                      )}
                      <span className={cn("absolute right-0 bottom-0 size-3.5 rounded-full ring-2 ring-surface", como.bolinha)} />
                    </span>
                  }
                  selo={<Badge tone={como.tone}>{como.texto}</Badge>}
                  className={cn(!e.ativo && "opacity-70")}
                >
                  <div className="flex flex-col gap-6">
                    <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div>
                        <dt className="font-bold text-muted">Entregas hoje</dt>
                        <dd className="tabular-nums">{e.hoje}</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-muted">Levando agora</dt>
                        <dd className="tabular-nums">{e.emRota}</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-muted">Moto</dt>
                        <dd>{[e.moto, e.placa].filter(Boolean).join(" · ") || "—"}</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-muted">Último acesso</dt>
                        <dd>{e.ultimoAcesso ? formatDateTime(e.ultimoAcesso) : "nunca entrou"}</dd>
                      </div>
                    </dl>

                    <EditarEntregador restaurantId={acesso.restaurant.id} entregador={e} />

                    <div className="border-t border-line pt-5">
                      <TrocarSenha restaurantId={acesso.restaurant.id} entregadorId={e.id} />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
                      <p className="text-sm text-muted">
                        {e.ativo
                          ? "Desligar tira o acesso na hora e desconecta o celular dele. O cadastro e as entregas feitas continuam aqui."
                          : "Religar devolve o acesso com a mesma senha."}
                      </p>
                      <form action={alternarEntregador}>
                        <input type="hidden" name="restaurantId" value={acesso.restaurant.id} />
                        <input type="hidden" name="entregadorId" value={e.id} />
                        <input type="hidden" name="ativo" value={e.ativo ? "0" : "1"} />
                        <SubmitButton variant={e.ativo ? "danger" : "secondary"} size="sm" pendingText="Mudando...">
                          {e.ativo ? "Desligar acesso" : "Religar acesso"}
                        </SubmitButton>
                      </form>
                    </div>
                  </div>
                </Gaveta>
              </li>
            );
          })}
        </ul>
      )}

      {/* O link que o dono manda para o entregador.
          No lugar do QR Code de baixar aplicativo: aqui não há aplicativo
          para instalar -- é o endereço da tela dele, que abre no navegador
          do celular e pode virar atalho na tela inicial. */}
      {entregadores.length > 0 && (
        <Gaveta titulo="Como o entregador entra" resumo="O link para mandar no WhatsApp dele." icone={<Smartphone />}>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">
              Mande este endereço para o entregador. Ele abre no navegador do celular e entra com o próprio telefone e a senha que você
              definiu — não precisa instalar nada. No Android, em “Adicionar à tela inicial”, vira um ícone como se fosse aplicativo.
            </p>
            <p className="rounded-control border border-line bg-surface-2 px-3 py-2 font-mono text-sm break-all">{entrada}</p>
            <div>
              <CopyLinkButton url={entrada} />
            </div>
          </div>
        </Gaveta>
      )}

      <Gaveta
        titulo="Cadastrar entregador"
        resumo="Nome, telefone e senha. Ele entra pelo celular com esses dados."
        icone={<UserPlus />}
        aberta={entregadores.length === 0}
      >
        <NovoEntregador restaurantId={acesso.restaurant.id} />
      </Gaveta>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-xs text-faint">
        <Info className="size-3.5" aria-hidden="true" />
        Menu Fácil Delivery · Sistema de entregas integrado
      </p>
    </div>
  );
}
