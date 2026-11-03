"use client";

import { AlertTriangle, Check, CornerUpLeft, Flag, Loader2 } from "lucide-react";
import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/cn";

import { assumir, confirmar, contarProblema, devolver, type AcaoState } from "../../acoes";

// Os botões da rua.
//
// Grandes e separados: quem toca aqui está de pé, com o capacete numa mão
// e o celular na outra. "Confirmar entrega" é o que ele mais usa e fica
// embaixo, no caminho do polegar; "tive um problema" fica ao lado, menor,
// porque é a exceção -- e porque dedo errado nele não pode ser fácil.

const MOTIVOS = [
  { chave: "CLIENTE_NAO_ENCONTRADO", nome: "Cliente não encontrado" },
  { chave: "ENDERECO_INCORRETO", nome: "Endereço incorreto" },
  { chave: "CLIENTE_NAO_ATENDE", nome: "Cliente não atende" },
  { chave: "PROBLEMA_COM_PEDIDO", nome: "Problema com o pedido" },
  { chave: "OUTRO", nome: "Outro motivo" },
] as const;

const GRANDE = "flex min-h-14 w-full items-center justify-center gap-2 rounded-control px-5 text-base font-extrabold transition active:scale-[0.99]";

function Botao({
  acao,
  orderId,
  numero,
  children,
  className,
  pendente,
}: {
  acao: (prev: AcaoState, formData: FormData) => Promise<AcaoState>;
  orderId: string;
  /** só na confirmação: é o que a tela de concluída mostra */
  numero?: number;
  children: React.ReactNode;
  className: string;
  pendente: string;
}) {
  const [state, enviar, carregando] = useActionState<AcaoState, FormData>(acao, {});
  return (
    <form action={enviar} className="flex w-full flex-col gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      {numero !== undefined && <input type="hidden" name="numero" value={numero} />}
      <button type="submit" disabled={carregando} className={cn(GRANDE, className, carregando && "opacity-70")}>
        {carregando ? (
          <>
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            {pendente}
          </>
        ) : (
          children
        )}
      </button>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
    </form>
  );
}

/** pedido livre: o primeiro que aceitar leva */
export function Assumir({ orderId }: { orderId: string }) {
  return (
    <Botao acao={assumir} orderId={orderId} pendente="Pegando..." className="bg-brand text-brand-ink">
      <Check className="size-5" aria-hidden="true" />
      Aceitar este pedido
    </Botao>
  );
}

/** pedido que já é dele: confirmar, devolver ou contar um problema */
export function NaMinhaMao({ orderId, numero }: { orderId: string; numero: number }) {
  // Confirmar entrega em dois toques.
  //
  // Com o botão grande à mão o tempo todo, o dedo acerta nele dentro da
  // mochila, com o pedido ainda na garupa. "Cheguei" é o passo que separa
  // o caminho da porta: até chegar, o que está à vista é a rota.
  const [chegou, setChegou] = useState(false);
  const [problema, setProblema] = useState(false);
  const [motivo, setMotivo] = useState<string>(MOTIVOS[0].chave);
  const [state, enviarProblema, enviandoProblema] = useActionState<AcaoState, FormData>(contarProblema, {});

  return (
    <div className="flex flex-col gap-3">
      {chegou ? (
        <Botao acao={confirmar} orderId={orderId} numero={numero} pendente="Confirmando..." className="bg-success text-white">
          <Check className="size-6" aria-hidden="true" />
          Confirmar entrega
        </Botao>
      ) : (
        <button
          type="button"
          onClick={() => setChegou(true)}
          className={cn(GRANDE, "bg-brand text-brand-ink")}
        >
          <Flag className="size-5" aria-hidden="true" />
          Cheguei no destino
        </button>
      )}

      {!problema ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setProblema(true)}
            className="flex min-h-13 flex-1 items-center justify-center gap-2 rounded-control border border-warning/40 bg-warning/10 px-4 font-bold text-warning"
          >
            <AlertTriangle className="size-5" aria-hidden="true" />
            Tive um problema
          </button>
          <Botao acao={devolver} orderId={orderId} pendente="Devolvendo..." className="min-h-13 border border-line text-muted">
            <CornerUpLeft className="size-5" aria-hidden="true" />
            Devolver
          </Botao>
        </div>
      ) : (
        <form action={enviarProblema} className="flex flex-col gap-3 rounded-card border border-warning/40 bg-warning/5 p-4">
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="motivo" value={motivo} />
          <p className="font-extrabold">O que aconteceu?</p>

          <div className="flex flex-col gap-2">
            {MOTIVOS.map((m) => {
              const aceso = m.chave === motivo;
              return (
                <button
                  key={m.chave}
                  type="button"
                  role="radio"
                  aria-checked={aceso}
                  onClick={() => setMotivo(m.chave)}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-control border px-4 text-left font-bold",
                    aceso ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface",
                  )}
                >
                  <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2", aceso ? "border-brand" : "border-line-strong")}>
                    {aceso && <span className="size-2.5 rounded-full bg-brand" />}
                  </span>
                  {m.nome}
                </button>
              );
            })}
          </div>

          <textarea
            name="descricao"
            rows={3}
            maxLength={200}
            placeholder="Conte o que houve (opcional)"
            className="w-full rounded-control border border-line bg-surface p-3 text-base"
          />

          {state.error && <Alert tone="danger">{state.error}</Alert>}
          {state.ok && <Alert tone="success">Avisamos o restaurante. O pedido continua com você.</Alert>}

          <div className="flex gap-2">
            <button type="submit" disabled={enviandoProblema} className={cn(GRANDE, "flex-1 bg-warning text-white", enviandoProblema && "opacity-70")}>
              {enviandoProblema ? "Enviando..." : "Avisar o restaurante"}
            </button>
            <button type="button" onClick={() => setProblema(false)} className="min-h-14 px-5 font-bold text-muted">
              Voltar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
