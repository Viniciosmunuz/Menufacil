"use client";

import { MessageSquare, X } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/format";

import type { ConversaAtiva } from "@/server/ia/conversas";

// A faixa das conversas da Lia, presa no fim da tela de Pedidos.
//
// Por que ela existe: eles deixam o painel aberto e não ficam de olho no
// WhatsApp. Até aqui, para saber que um cliente ficou sem resposta no meio
// de um pedido, alguém tinha de abrir conversa por conversa -- e em
// 24/11/2026 foi assim que ele descobriu, de print em print, que um cliente
// passou quarenta minutos mandando "cadê a salada".
//
// **Presa, e não rolando com a lista.** A primeira versão ficava embaixo
// dos pedidos, no fluxo: com três pedidos aparecia, com doze sumia da tela
// -- a mesma gaveta escondida, com outra roupa. Ele pediu "nada escondido",
// e nada escondido quer dizer visível também num sábado cheio.
//
// É fila de trabalho, não histórico: quem só mandou "oi" nunca entra, e
// quem virou pedido sai (o assunto passa a ser o pedido, que está na mesma
// tela). Quem decide isso é `conversasAtivas`, no servidor.
//
// Não tem caixa de digitação, de propósito: com ela, alguém escreveria aqui
// achando que mandou, e a mensagem não sairia. Um botão só, que abre a
// conversa certa no WhatsApp.

// Os cinco estados. Os três primeiros pedem alguém e vêm coloridos; os
// dois últimos são o que ela já resolveu, e ficam apagados de propósito
// -- a faixa serve para achar quem está esperando, não para comemorar o
// que deu certo. O resolvido fica ali só para a conta do dia fechar.
const SELO: Record<ConversaAtiva["estado"], { texto: string; classe: string }> = {
  "sem-resposta": { texto: "sem resposta", classe: "bg-danger text-white" },
  atendente: { texto: "atendente assumiu", classe: "bg-warning-soft text-warning-ink" },
  atendendo: { texto: "Lia atendendo", classe: "bg-zap/15 text-zap-escuro" },
  pedido: { texto: "virou pedido", classe: "bg-success-soft text-success-ink" },
  encerrada: { texto: "encerrada", classe: "bg-surface-3 text-faint" },
};

/** já resolvida: fica na faixa, mas apagada */
const resolvida = (c: ConversaAtiva) => c.estado === "pedido" || c.estado === "encerrada";

/** "agora", "há 3 min", "há 1 h" -- o tempo que decide se alguém larga o que está fazendo */
function desde(quando: Date) {
  const min = Math.floor((Date.now() - new Date(quando).getTime()) / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  return `há ${Math.floor(min / 60)} h`;
}

export function FaixaDeConversas({ restaurantId, conversas }: { restaurantId: string; conversas: ConversaAtiva[] }) {
  const [aberta, setAberta] = useState<ConversaAtiva | null>(null);

  // vazia na maior parte do tempo, e aí não ocupa nada: faixa com zero
  // cartão seria uma tarja cinza tomando espaço para dizer "nada aqui"
  if (conversas.length === 0) return null;

  const esperando = conversas.filter((c) => c.estado === "sem-resposta").length;

  return (
    <>
      {/* O espaço que a barra presa ocupa, devolvido ao conteúdo.
          Sem ele, a faixa cobre o último pedido da lista -- e o pedido
          que some é sempre o mais novo, que é o que importa.

          7,5rem foi medido no navegador, não estimado: a faixa dá 117 px
          com o cartão de duas linhas mais o selo, e o meu chute inicial
          de 5,5rem deixava trinta pixels do último pedido debaixo dela. */}
      <div aria-hidden="true" className="h-[7.5rem]" />

      {/* Presa no fim da tela. No celular sobe para cima da barra de menu,
          que já mora ali -- duas barras no mesmo lugar escondem uma à
          outra, e a de navegação é a que não pode sumir. */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t-2 border-brand bg-surface px-3 pt-2 pb-2 shadow-[0_-10px_24px_rgba(0,0,0,0.12)] lg:bottom-0 lg:pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-3.5 text-muted" aria-hidden="true" />
            <span className="text-[0.65rem] font-extrabold uppercase tracking-wider text-muted">Conversas da Lia</span>
            {esperando > 0 && (
              <span className="ml-auto text-[0.65rem] font-extrabold text-danger">
                {esperando === 1 ? "1 precisa de você" : `${esperando} precisam de você`}
              </span>
            )}
          </div>

          <ul className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {conversas.map((c) => {
              const selo = SELO[c.estado];
              return (
                <li key={c.contato} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setAberta(c)}
                    className={cn(
                      "w-[11rem] rounded-control border p-2 text-left transition-colors",
                      c.estado === "sem-resposta"
                        ? "border-danger bg-danger-soft"
                        : "border-line bg-surface-2 hover:border-line-strong",
                      // o que já passou fica apagado: a faixa é para achar
                      // quem espera, e o resolvido não pode disputar o olho
                      resolvida(c) && "opacity-60",
                    )}
                  >
                    <span className="flex items-baseline gap-1.5">
                      <span className="min-w-0 flex-1 truncate text-xs font-extrabold">
                        {c.nome ?? formatPhone(c.telefone)}
                      </span>
                      <span className="shrink-0 text-[0.6rem] font-bold text-faint">{desde(c.quando)}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[0.7rem] text-muted">
                      {c.papel === "IA" ? "Lia: " : c.papel === "HUMANO" ? "Você: " : ""}
                      {c.ultima}
                    </span>
                    <span
                      className={cn(
                        "mt-1 inline-block rounded-full px-1.5 py-px text-[0.55rem] font-extrabold uppercase",
                        selo.classe,
                      )}
                    >
                      {selo.texto}
                      {c.estado === "pedido" && c.pedido !== null ? ` #${c.pedido}` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {aberta && <Conversa conversa={aberta} restaurantId={restaurantId} fechar={() => setAberta(null)} />}
    </>
  );
}

/**
 * A conversa aberta por cima, só para ler.
 *
 * Busca as falas na hora do toque, e não junto com a faixa: carregar o
 * texto de todas as conversas para mostrar quatro cartões seria pagar a
 * consulta inteira a cada dez segundos, que foi o que estourou a conta da
 * Vercel em 15/11/2026.
 */
type Fala = { id: string; papel: string; texto: string };

function Conversa({
  conversa,
  restaurantId,
  fechar,
}: {
  conversa: ConversaAtiva;
  restaurantId: string;
  fechar: () => void;
}) {
  const [falas, setFalas] = useState<Fala[] | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let vivo = true;
    void fetch(
      `/api/painel/${restaurantId}/conversa?contato=${encodeURIComponent(conversa.contato)}`,
      { cache: "no-store" },
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { falas: Fala[] }) => vivo && setFalas(d.falas))
      .catch(() => vivo && setErro(true));
    return () => {
      vivo = false;
    };
  }, [restaurantId, conversa.contato]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6" onClick={fechar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80dvh] w-full max-w-md flex-col overflow-hidden rounded-t-card bg-surface shadow-2xl sm:rounded-card"
      >
        <div className="flex items-center gap-2 border-b border-line p-3">
          <span className="min-w-0 flex-1 truncate font-extrabold">
            {conversa.nome ?? formatPhone(conversa.telefone)}
          </span>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar a conversa"
            className="grid size-8 shrink-0 place-items-center rounded-control text-faint hover:bg-surface-2 hover:text-ink"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-3">
          {erro && <p className="text-center text-sm text-muted">Não consegui carregar agora.</p>}
          {!erro && falas === null && <p className="text-center text-sm text-faint">Carregando...</p>}
          {falas?.map((f) => (
            <p
              key={f.id}
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-control px-3 py-2 text-sm",
                f.papel === "CLIENTE" ? "self-start bg-surface-2" : "self-end bg-zap/15",
              )}
            >
              {f.texto}
            </p>
          ))}
        </div>

        {/* Sem caixa de digitação: daqui não sai mensagem, e o botão deixa
            isso claro em vez de deixar a dúvida. */}
        <div className="border-t border-line p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <a
            href={`https://wa.me/${conversa.telefone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center rounded-control bg-zap px-4 py-2.5 text-sm font-bold text-white hover:bg-zap-escuro"
          >
            Responder no WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
