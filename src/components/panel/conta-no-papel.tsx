"use client";

import { Printer } from "lucide-react";
import { useActionState } from "react";

import { pedirAContaNoPapel, type SalaoFormState } from "@/app/painel/[restaurantId]/salao/actions";
import { cn } from "@/lib/cn";

// O botão da conta.
//
// Com o Menu Fácil PC ligado, o toque manda a conta para a impressora
// principal -- a do balcão, de onde o garçom busca o papel para levar à
// mesa. É o que ele precisa: no celular não há impressora, e abrir a via
// na tela só servia para quem estava no computador.
//
// Sem nenhuma impressora pareada, o botão continua abrindo a via na tela,
// que é o jeito de imprimir pelo navegador.

export function ContaNoPapel({
  restaurantId,
  comandaId,
  temConta,
  temImpressora,
  className,
}: {
  restaurantId: string;
  comandaId: string;
  /** mesa sem nada lançado não tem conta para tirar */
  temConta: boolean;
  temImpressora: boolean;
  className?: string;
}) {
  const [estado, pedir, pedindo] = useActionState<SalaoFormState, FormData>(pedirAContaNoPapel, {});

  if (!temImpressora) {
    return (
      <a
        href={temConta ? `/painel/${restaurantId}/salao/conta/${comandaId}` : undefined}
        target="_blank"
        rel="noopener"
        aria-label="Imprimir a conta"
        className={cn(className, temConta ? "" : "pointer-events-none opacity-40")}
      >
        <Printer className="size-5" aria-hidden="true" />
      </a>
    );
  }

  return (
    <form action={pedir} className="contents">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <input type="hidden" name="comandaId" value={comandaId} />
      <button
        type="submit"
        disabled={!temConta || pedindo}
        aria-label="Imprimir a conta no balcão"
        title={estado.error ?? (estado.ok ? "Conta indo para a impressora do balcão" : "Imprimir a conta no balcão")}
        className={cn(className, "disabled:opacity-40", estado.error && "text-danger")}
      >
        <Printer className={cn("size-5", pedindo && "animate-pulse")} aria-hidden="true" />
      </button>
    </form>
  );
}
