"use client";

import { Printer } from "lucide-react";
import { useState } from "react";

import { useDesktopApp } from "@/components/panel/desktop-printer";
import { Button, buttonClasses } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";

// O botão Imprimir de um pedido. São três situações, e ele escolhe sozinho:
//
//  1. Dentro do Menu Fácil PC: a impressora está neste computador, então a
//     via vai direto para ela, pela ponte do aplicativo. É o caso que
//     ficava mudo: o botão ou abria uma aba nova, que dentro do aplicativo
//     não vai a lugar nenhum, ou destravava a via no servidor esperando um
//     Print Fácil que não estava ligado. Quem está sentado na frente da
//     impressora não depende de mais ninguém para imprimir.
//  2. Fora do aplicativo, com um computador do balcão acordado: destrava a
//     via e ela sai lá (quem toca costuma estar no celular).
//  3. Sem nada disso: abre a via para o navegador de quem tocou imprimir.
//
// O que acontece aparece no próprio botão, porque o silêncio foi a queixa:
// "Enviado" quando saiu, e o motivo quando a impressora recusou.

type Variante = "ghost" | "secondary";

export function BotaoImprimir({
  base,
  restaurantId,
  orderId,
  numero,
  computadorAcordado,
  reprintAction,
  markPrintedAction,
  variante = "ghost",
  rotulo = "Imprimir",
}: {
  /** o endereço da lista de pedidos: /painel/<id>/pedidos */
  base: string;
  restaurantId: string;
  orderId: string;
  numero?: number;
  /** tem Print Fácil acordado no balcão (quem responde é o servidor) */
  computadorAcordado: boolean;
  reprintAction: (formData: FormData) => Promise<void>;
  markPrintedAction: (formData: FormData) => Promise<void>;
  variante?: Variante;
  rotulo?: string;
}) {
  const { app } = useDesktopApp();
  const [estado, setEstado] = useState<"parado" | "enviando" | "enviado">("parado");
  const [erro, setErro] = useState<string | null>(null);

  async function imprimirAqui() {
    if (!app || estado === "enviando") return;
    setEstado("enviando");
    setErro(null);
    try {
      const resposta = await fetch(`${base}/${orderId}/via?formato=json`);
      const via = resposta.ok ? await resposta.json() : null;
      if (!via?.texto) throw new Error("Não consegui montar a via deste pedido.");
      const saida = await app.imprimir({ texto: via.texto, dados: via.dados, papel: via.papel_mm, numero: via.numero ?? numero });
      if (!saida?.ok) throw new Error(saida?.erro || "A impressora não respondeu.");
      const dados = new FormData();
      dados.set("restaurantId", restaurantId);
      dados.set("orderId", orderId);
      void markPrintedAction(dados);
      setEstado("enviado");
      setTimeout(() => setEstado("parado"), 2500);
    } catch (e) {
      setEstado("parado");
      setErro(e instanceof Error ? e.message : "Não deu para imprimir agora.");
    }
  }

  if (app) {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <Button variant={variante} size="sm" onClick={() => void imprimirAqui()} disabled={estado === "enviando"}>
          <Printer className="size-4" aria-hidden="true" />
          {estado === "enviando" ? "Imprimindo..." : estado === "enviado" ? "Enviado" : rotulo}
        </Button>
        {erro && (
          <span role="alert" className="text-xs font-bold text-danger">
            {erro}
          </span>
        )}
      </span>
    );
  }

  if (computadorAcordado) {
    return (
      <form action={reprintAction}>
        <input type="hidden" name="restaurantId" value={restaurantId} />
        <input type="hidden" name="orderId" value={orderId} />
        <SubmitButton variant={variante} size="sm" pendingText="Mandando...">
          <Printer className="size-4" aria-hidden="true" />
          {rotulo}
        </SubmitButton>
      </form>
    );
  }

  return (
    <a href={`${base}/${orderId}/via`} target="_blank" rel="noopener noreferrer" className={buttonClasses(variante, "sm")}>
      <Printer className="size-4" aria-hidden="true" />
      {rotulo}
    </a>
  );
}
