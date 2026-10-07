"use client";

import { Check, Pencil, X } from "lucide-react";
import { useActionState, useState } from "react";

import { renomearMesa, type SalaoFormState } from "@/app/painel/[restaurantId]/salao/actions";

// O nome da mesa, com o lápis ao lado.
//
// "Mesa 7" serve até o salão ter a mesa da varanda e a do fundo -- e aí o
// garçom fala pelo nome, não pelo número. O número continua identificando:
// o nome é um apelido por cima, e o lápis fica onde a pessoa já está
// olhando, em vez de numa tela de configuração a três toques daqui.

export function NomeDaMesa({
  restaurantId,
  mesaId,
  rotulo,
  numero,
  nome,
}: {
  restaurantId: string;
  mesaId: string;
  /** "Mesa" ou "Balcão" */
  rotulo: string;
  numero: number;
  nome: string | null;
}) {
  const [editando, setEditando] = useState(false);
  const [estado, salvar, salvando] = useActionState<SalaoFormState, FormData>(renomearMesa, {});

  // salvou: o campo fecha e o título já mostra o nome novo, porque a ação
  // revalida a página. O ajuste é no render porque reage a um dado que
  // chegou, não a um efeito colateral.
  const [ultimo, setUltimo] = useState<string | undefined>(undefined);
  if (estado.ok && estado.message !== ultimo) {
    setUltimo(estado.message);
    setEditando(false);
  }

  if (editando) {
    return (
      <form action={salvar} className="flex min-w-0 flex-1 items-center gap-2">
        <input type="hidden" name="restaurantId" value={restaurantId} />
        <input type="hidden" name="mesaId" value={mesaId} />
        <input
          name="nome"
          defaultValue={nome ?? ""}
          maxLength={40}
          autoFocus
          placeholder={rotulo + " " + numero}
          aria-label="Nome da mesa"
          className="h-11 min-w-0 flex-1 rounded-control border border-line bg-surface px-3 text-lg font-extrabold outline-none placeholder:font-bold placeholder:text-faint focus:border-brand"
        />
        <button
          type="submit"
          disabled={salvando}
          aria-label="Salvar o nome"
          className="grid size-10 shrink-0 place-items-center rounded-control bg-brand text-brand-ink disabled:opacity-40"
        >
          <Check className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setEditando(false)}
          aria-label="Cancelar"
          className="grid size-10 shrink-0 place-items-center rounded-control text-muted hover:text-ink"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </form>
    );
  }

  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <h1 className="truncate text-2xl font-extrabold">{nome ?? rotulo + " " + numero}</h1>
      {/* com apelido, o número continua à vista: é por ele que a cozinha
          e a comanda se entendem */}
      {nome && <span className="shrink-0 text-sm font-bold text-faint">{rotulo + " " + numero}</span>}
      <button
        type="button"
        onClick={() => setEditando(true)}
        aria-label="Mudar o nome da mesa"
        className="grid size-8 shrink-0 place-items-center rounded-control text-faint hover:text-ink"
      >
        <Pencil className="size-4" aria-hidden="true" />
      </button>
    </span>
  );
}
