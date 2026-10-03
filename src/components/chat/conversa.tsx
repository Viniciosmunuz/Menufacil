"use client";

import { Send } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
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
  const campo = useRef<HTMLInputElement>(null);
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

  // o campo só é limpo quando a mensagem saiu de verdade: falhou o envio,
  // o que foi digitado continua ali para a pessoa tentar de novo
  useEffect(() => {
    if (state.enviadaEm && campo.current) campo.current.value = "";
  }, [state.enviadaEm]);

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
                  <p className="break-words whitespace-pre-wrap">{m.texto}</p>
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
        <form action={action} className="flex gap-2">
          {Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <input
            ref={campo}
            name="texto"
            maxLength={500}
            autoComplete="off"
            placeholder="Escreva uma mensagem"
            aria-label="Mensagem"
            className="h-11 w-full min-w-0 rounded-control border border-line bg-surface px-4 text-base text-ink placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
          />
          <BotaoEnviar />
        </form>
      )}
    </div>
  );
}
