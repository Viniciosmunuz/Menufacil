"use client";

import { ImagePlus, Send, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";

// A conversa do pedido, a mesma dos dois lados.
//
// Um componente só para o cliente e para o balcão porque a conversa é a
// mesma coisa: o que muda é de quem são as bolhas da direita. Fazer duas
// telas separadas daria duas chances de elas discordarem sobre o que foi
// dito.
//
// As mensagens vêm desenhadas do servidor, e quem traz as novas é o canal
// ao vivo da página (PedidoAoVivo no cliente, OrdersLive no painel): aqui
// não há lista guardada no navegador para ficar fora de sincronia.

export type MensagemNaTela = {
  id: string;
  autor: "CUSTOMER" | "RESTAURANT";
  autorNome: string | null;
  texto: string;
  /** a foto da mensagem, quando tem; o texto pode vir vazio */
  imagem: string | null;
  em: string;
  lida: boolean;
};

export type EstadoDaConversa = { error?: string; enviadaEm?: number };

function BotaoEnviar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Enviar mensagem"
      className="grid size-11 shrink-0 place-items-center rounded-control bg-brand text-bg disabled:opacity-60"
    >
      <Send className="size-5" aria-hidden="true" />
    </button>
  );
}

/**
 * O que se escreve e o que se anexa.
 *
 * Fica num componente à parte para poder ser remontado por chave quando a
 * mensagem sai: é o jeito de esvaziar campo, prévia e arquivo escolhido de
 * uma vez, sem mexer em estado dentro de efeito.
 */
function Campos({
  action,
  hidden,
}: {
  action: (formData: FormData) => void;
  hidden: Record<string, string>;
}) {
  const arquivo = useRef<HTMLInputElement>(null);
  // a foto escolhida aparece antes de ir: quem manda comprovante do celular
  // precisa ver que pegou o print certo, e não o da conversa anterior
  const [previa, setPrevia] = useState<string | null>(null);

  const trocarFoto = (escolhido: File | undefined) => {
    setPrevia((atual) => {
      if (atual) URL.revokeObjectURL(atual);
      return escolhido ? URL.createObjectURL(escolhido) : null;
    });
  };

  return (
    <form action={action} className="flex flex-col gap-2">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <input
        ref={arquivo}
        type="file"
        name="foto"
        accept="image/*"
        className="sr-only"
        aria-label="Escolher uma foto"
        onChange={(e) => trocarFoto(e.target.files?.[0])}
      />

      {previa && (
        <div className="flex items-center gap-2.5 rounded-control border border-line bg-surface p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previa} alt="Foto escolhida" className="size-12 shrink-0 rounded-md object-cover" />
          <span className="min-w-0 flex-1 text-sm text-muted">Foto pronta para enviar</span>
          <button
            type="button"
            onClick={() => {
              trocarFoto(undefined);
              if (arquivo.current) arquivo.current.value = "";
            }}
            aria-label="Tirar a foto"
            className="grid size-9 shrink-0 place-items-center rounded-control text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X className="size-[1.1rem]" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => arquivo.current?.click()}
          aria-label="Enviar uma foto"
          className="grid size-11 shrink-0 place-items-center rounded-control border border-line bg-surface text-muted transition-colors hover:border-brand hover:text-brand"
        >
          <ImagePlus className="size-5" aria-hidden="true" />
        </button>
        <input
          name="texto"
          maxLength={500}
          autoComplete="off"
          placeholder={previa ? "Escreva algo (opcional)" : "Escreva uma mensagem"}
          aria-label="Mensagem"
          className="h-11 w-full min-w-0 rounded-control border border-line bg-surface px-4 text-base text-ink placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
        />
        <BotaoEnviar />
      </div>
    </form>
  );
}

export function Conversa({
  mensagens,
  euSou,
  acao,
  hidden,
  vazio,
  fechada = false,
  fechadaTexto,
  className,
}: {
  mensagens: MensagemNaTela[];
  /** de quem são as bolhas da direita */
  euSou: "CUSTOMER" | "RESTAURANT";
  acao: (state: EstadoDaConversa, formData: FormData) => Promise<EstadoDaConversa>;
  /** campos que a ação precisa (o código do pedido, o id do restaurante) */
  hidden: Record<string, string>;
  /** o que aparece quando ninguém falou nada ainda */
  vazio: string;
  /** pedido encerrado: mostra o que foi dito, sem campo para escrever */
  fechada?: boolean;
  fechadaTexto?: string;
  className?: string;
}) {
  const [state, action] = useActionState<EstadoDaConversa, FormData>(acao, {});
  const caixa = useRef<HTMLDivElement>(null);
  const quantas = mensagens.length;

  // A conversa abre no fim, onde está a última mensagem -- mexendo só na
  // rolagem da própria caixa.
  //
  // Antes isto era um scrollIntoView, que rola a *página*: a pessoa abria a
  // tela do pedido e ela se jogava lá para baixo sozinha, parando na altura
  // da conversa. Quem chegou para pagar o Pix, que fica no topo, tinha de
  // rolar de volta. Acontecia até sem mensagem nenhuma na conversa.
  useEffect(() => {
    const el = caixa.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [quantas]);


  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        ref={caixa}
        className="flex max-h-96 min-h-24 flex-col gap-2 overflow-y-auto overscroll-contain rounded-control border border-line bg-surface-2 p-3"
      >
        {quantas === 0 ? (
          <p className="my-auto text-center text-sm text-muted">{vazio}</p>
        ) : (
          mensagens.map((m) => {
            const minha = m.autor === euSou;
            return (
              <div key={m.id} className={cn("flex flex-col", minha ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
                    minha ? "rounded-br-md bg-brand text-bg" : "rounded-bl-md bg-surface-3 text-ink",
                  )}
                >
                  {/* quem é do outro lado tem nome: num restaurante com três
                      pessoas no balcão, saber quem respondeu resolve discussão */}
                  {!minha && m.autorNome && <p className="mb-0.5 text-xs font-extrabold opacity-70">{m.autorNome}</p>}

                  {/* A foto abre em aba nova no tamanho cheio: comprovante
                      de Pix tem letra miúda, e a bolha do chat é estreita
                      demais para conferir valor e nome ali dentro.

                      Cabe inteira (object-contain) em vez de preencher:
                      comprovante cortado perde justamente o valor e o nome,
                      que é o que se quer conferir.

                      É <img> e não next/image de propósito: cada tamanho
                      servido pelo next/image gasta uma transformação da
                      cota do plano, e a foto já sai daqui redimensionada e
                      em WebP pelo sharp. */}
                  {m.imagem && (
                    <a
                      href={m.imagem}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn("block overflow-hidden rounded-xl", m.texto && "mb-1.5")}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.imagem}
                        alt={minha ? "Foto que você enviou" : "Foto enviada na conversa"}
                        loading="lazy"
                        className="block max-h-72 w-full bg-black/5 object-contain"
                      />
                    </a>
                  )}

                  {m.texto && <p className="break-words whitespace-pre-wrap">{m.texto}</p>}
                </div>
                {/* só a hora: o "lida" não entra. Conversa de pedido é
                    curta e tem o andamento do lado contando a verdade -- o
                    recibo de leitura só criaria cobrança de resposta */}
                <span className="mt-0.5 px-1 text-[0.7rem] text-faint">{formatTime(new Date(m.em))}</span>
              </div>
            );
          })
        )}
      </div>

      {state.error && <Alert tone="danger">{state.error}</Alert>}

      {fechada ? (
        <p className="text-sm text-muted">{fechadaTexto ?? "Este pedido foi encerrado, então a conversa dele também."}</p>
      ) : (
        // A chave troca a cada mensagem que saiu de verdade, e com ela o
        // formulário inteiro nasce de novo: campo vazio, foto solta,
        // arquivo escolhido esquecido. Limpar na mão exigiria mexer em
        // estado dentro de efeito, que é o caminho que leva a render em
        // cascata -- e falhou o envio, nada se perde, porque a chave não
        // mudou.
        <Campos key={state.enviadaEm ?? 0} action={action} hidden={hidden} />
      )}
    </div>
  );
}
