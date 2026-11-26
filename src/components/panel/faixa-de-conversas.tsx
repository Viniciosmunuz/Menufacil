"use client";

import { ChevronDown, ChevronUp, MessageSquare, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

// Os cinco estados, ditos por um ponto de cor e uma palavra miúda.
//
// A primeira versão usava cinco etiquetas de fundo colorido e caixa alta,
// lado a lado. Cada uma sozinha ficava boa; as cinco em fila viravam
// confete, e a faixa gritava mais alto que o pedido, que é o que a tela
// serve para mostrar. Um ponto diz a mesma coisa e cala a boca.
//
// Só os dois estados vivos têm cor no texto e listra na lateral: vermelho
// quando o cliente está esperando alguém, verde enquanto a Lia está no meio
// do atendimento. O resto é cinza, porque não pede nada de ninguém.
const ESTADO: Record<
  ConversaAtiva["estado"],
  { texto: string; ponto: string; letra: string; listra?: string }
> = {
  "sem-resposta": { texto: "sem resposta", ponto: "bg-danger", letra: "text-danger", listra: "border-l-danger" },
  atendente: { texto: "atendente assumiu", ponto: "bg-warning", letra: "text-muted" },
  atendendo: { texto: "em atendimento", ponto: "bg-zap", letra: "text-zap-escuro", listra: "border-l-zap" },
  pedido: { texto: "virou pedido", ponto: "bg-success", letra: "text-faint" },
  encerrada: { texto: "encerrada", ponto: "bg-line-strong", letra: "text-faint" },
};

/** já resolvida: fica na faixa, mas apagada */
const resolvida = (c: ConversaAtiva) => c.estado === "pedido" || c.estado === "encerrada";

/** quanto tempo a faixa fechada fica à mostra quando chega conversa nova */
const ESPIADA_MS = 60_000;

/** "agora", "há 3 min", "há 1 h" -- o tempo que decide se alguém larga o que está fazendo */
function desde(quando: Date) {
  const min = Math.floor((Date.now() - new Date(quando).getTime()) / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  return `há ${Math.floor(min / 60)} h`;
}

export function FaixaDeConversas({ restaurantId, conversas }: { restaurantId: string; conversas: ConversaAtiva[] }) {
  const [aberta, setAberta] = useState<ConversaAtiva | null>(null);

  // Nasce aberta toda vez que o painel abre, de propósito: fechada é
  // escolha do momento, não preferência guardada. Quem fechou porque a
  // tela estava cheia não quer isso valendo amanhã de manhã.
  const [mostrando, setMostrando] = useState(true);

  // Quem já estava aqui na volta anterior do retrato. O `null` do começo é
  // o que impede a primeira carga de contar como "chegaram cinco
  // conversas novas" e disparar a espiada à toa.
  const vistos = useRef<Set<string> | null>(null);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);
  // o estado de agora, para o efeito ler sem virar dependência: com
  // `mostrando` na lista, fechar a faixa na mão já re-rodaria a conta das
  // conversas novas e ela subiria de volta sozinha
  const estaMostrando = useRef(true);
  useEffect(() => {
    estaMostrando.current = mostrando;
  }, [mostrando]);

  useEffect(() => {
    const agora = new Set(conversas.map((c) => c.contato));
    const antes = vistos.current;
    vistos.current = agora;
    if (!antes) return;

    // Conversa nova com a faixa abaixada: ela sobe sozinha, mostra quem
    // chegou e desce de novo. É isto que impede a seta de transformar a
    // faixa naquela gaveta escondida que a gente já tinha descartado --
    // fechada ela continua avisando, só não ocupa espaço o tempo todo.
    const novas = [...agora].some((c) => !antes.has(c));
    if (!novas || estaMostrando.current) return;

    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = setTimeout(() => setMostrando(false), ESPIADA_MS);
    setMostrando(true);
  }, [conversas]);

  useEffect(() => () => void (relogio.current && clearTimeout(relogio.current)), []);

  /** a pessoa mexeu: a espiada vira decisão dela, e o relógio para */
  function assumeOControle() {
    if (relogio.current) {
      clearTimeout(relogio.current);
      relogio.current = null;
    }
  }

  // vazia na maior parte do tempo, e aí não ocupa nada: faixa com zero
  // cartão seria uma tarja cinza tomando espaço para dizer "nada aqui"
  if (conversas.length === 0) return null;

  const esperando = conversas.filter((c) => c.estado === "sem-resposta").length;

  return (
    <>
      {/* O espaço que a barra presa ocupa, devolvido ao conteúdo.
          Sem ele, a faixa cobre o último pedido da lista -- e o pedido
          que some é sempre o mais novo, que é o que importa.

          7,5rem foi medido no navegador, não estimado: a faixa dá 114 px
          com o cartão de duas linhas mais o selo, e o meu chute inicial
          de 5,5rem deixava trinta pixels do último pedido debaixo dela.
          Fechada, sobra só o cabeçalho com a seta. */}
      <div aria-hidden="true" className={mostrando ? "h-[7.5rem]" : "h-9"} />

      {/* Presa no fim da coluna do conteúdo. No celular vai de ponta a
          ponta e sobe para cima da barra de menu, que já mora ali -- duas
          barras no mesmo lugar escondem uma à outra, e a de navegação é a
          que não pode sumir. Na tela larga ela começa onde o menu lateral
          acaba (`--trilho`, publicada pelo PanelShell): é uma barra da aba
          Pedidos, e não uma tarja por cima do painel inteiro.

          A linha de cima é fina e da cor das outras linhas da tela. Era
          laranja de 2 px, e com isso virava o traço mais forte do painel:
          o olho batia nela antes de bater no pedido. */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-surface px-3 pt-2 pb-2 shadow-[0_-6px_16px_rgba(0,0,0,0.05)] lg:left-[var(--trilho)] lg:bottom-0 lg:pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="size-3 text-faint" aria-hidden="true" />
            <span className="text-[0.65rem] font-semibold text-faint">Conversas da Lia</span>
            <button
              type="button"
              onClick={() => {
                assumeOControle();
                setMostrando((v) => !v);
              }}
              aria-expanded={mostrando}
              aria-label={mostrando ? "Esconder as conversas" : "Mostrar as conversas"}
              title={mostrando ? "Esconder as conversas" : "Mostrar as conversas"}
              className="grid size-5 place-items-center rounded-control text-faint hover:bg-surface-2 hover:text-ink"
            >
              {mostrando ? (
                <ChevronDown className="size-3.5" aria-hidden="true" />
              ) : (
                <ChevronUp className="size-3.5" aria-hidden="true" />
              )}
            </button>
            {esperando > 0 && (
              <span className="ml-auto text-[0.65rem] font-semibold text-danger">
                {esperando === 1 ? "1 precisa de você" : `${esperando} precisam de você`}
              </span>
            )}
          </div>

          {mostrando && (
            <ul className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {conversas.map((c) => {
                const e = ESTADO[c.estado];
                return (
                  <li key={c.contato} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        assumeOControle();
                        setAberta(c);
                      }}
                      className={cn(
                        "w-[11.5rem] rounded-control border border-line bg-surface px-2.5 py-2 text-left transition-colors hover:border-line-strong",
                        // Os estados vivos ganham uma listra na lateral, e
                        // não um cartão pintado inteiro: a listra é a mesma
                        // marca que o cartão de pedido já usa nesta tela, e
                        // chama sem tingir a faixa toda.
                        e.listra && cn("border-l-[3px]", e.listra),
                        // o que já passou fica apagado: a faixa é para achar
                        // quem espera, e o resolvido não pode disputar o olho
                        resolvida(c) && "opacity-55",
                      )}
                    >
                      <span className="flex items-baseline gap-1.5">
                        <span className="min-w-0 flex-1 truncate text-xs font-bold">
                          {c.nome ?? formatPhone(c.telefone)}
                        </span>
                        <span className="shrink-0 text-[0.6rem] text-faint">{desde(c.quando)}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-[0.7rem] text-muted">
                        {c.papel === "IA" ? "Lia: " : c.papel === "HUMANO" ? "Você: " : ""}
                        {c.ultima}
                      </span>
                      <span className="mt-1.5 flex items-center gap-1.5">
                        <span className={cn("size-1.5 shrink-0 rounded-full", e.ponto)} aria-hidden="true" />
                        <span className={cn("truncate text-[0.6rem] font-medium", e.letra)}>
                          {e.texto}
                          {c.estado === "pedido" && c.pedido !== null ? ` #${c.pedido}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
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
