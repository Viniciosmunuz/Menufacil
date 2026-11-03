import { Bike, CircleSlash, PauseCircle, Smartphone, UserPlus, Users } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/panel/page-header";
import { StatCard } from "@/components/panel/stat-card";
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
  if (!e.ativo) return { texto: "Desligado", tone: "neutral" as const };
  if (e.emRota > 0) return { texto: e.emRota === 1 ? "Em entrega" : `${e.emRota} entregas`, tone: "info" as const };
  if (e.disponibilidade === "DISPONIVEL") return { texto: "Disponível", tone: "success" as const };
  if (e.disponibilidade === "PAUSA") return { texto: "Em pausa", tone: "warning" as const };
  return { texto: "Fora do ar", tone: "neutral" as const };
}

export default async function EntregadoresPage({ params }: PageProps<"/painel/[restaurantId]/entregadores">) {
  const { restaurantId } = await params;
  const acesso = await requireEntregadores(restaurantId);
  const [{ entregadores, semEntregador }, emRota] = await Promise.all([quadroDeEntregas(acesso.restaurant.id), pedidosEmRota(acesso.restaurant.id)]);
  const { total, disponiveis, emEntrega, inativos } = contarEntregadores(entregadores);
  const entrada = `${appUrl()}/entrar`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Entregadores"
        description="Quem leva os pedidos do seu restaurante. Cada um entra no celular com o próprio telefone e confirma a entrega por lá."
      />

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
        <StatCard label="Cadastrados" value={total} icon={<Users />} tom="brand" />
        <StatCard label="Disponíveis agora" value={disponiveis} icon={<Bike />} tom="success" />
        <StatCard label="Em entrega" value={emEntrega} icon={<PauseCircle />} tom="info" />
        <StatCard label="Desligados" value={inativos} icon={<CircleSlash />} tom="warning" />
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
                    e.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- retrato pequeno, já recortado no envio
                      <img src={e.fotoUrl} alt="" className="size-9 rounded-full object-cover" />
                    ) : (
                      <span className="grid size-9 place-items-center rounded-full bg-surface-3 text-muted">
                        <Bike className="size-4" aria-hidden="true" />
                      </span>
                    )
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
        <Gaveta
          titulo="Como o entregador entra"
          resumo="O link para mandar no WhatsApp dele."
          icone={<Smartphone />}
        >
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
    </div>
  );
}
