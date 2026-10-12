"use client";

import { Printer } from "lucide-react";
import { useActionState } from "react";

import { definirImpressoraDaSecao, type SalaoFormState } from "@/app/painel/[restaurantId]/salao/actions";
import { cn } from "@/lib/cn";

// De onde sai cada seção do cardápio.
//
// Um toque no nome da impressora e pronto -- sem botão de salvar, como o
// interruptor do cardápio: é uma escolha entre duas ou três coisas, e
// nenhuma delas custa a desfazer.
//
// "Balcão" é a ausência de escolha, e não uma impressora: a seção sem
// destino sai onde sempre saiu. É também o que faz uma seção nova nunca
// ficar sem impressora enquanto o dono não a configura.

export function ImpressoraDaSecao({
  restaurantId,
  categoriaId,
  nome,
  atual,
  impressoras,
}: {
  restaurantId: string;
  categoriaId: string;
  nome: string;
  atual: string | null;
  impressoras: { id: string; nome: string }[];
}) {
  const [estado, salvar] = useActionState<SalaoFormState, FormData>(definirImpressoraDaSecao, {});

  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0">
      <p className="font-bold">{nome}</p>
      <div className="flex flex-wrap gap-2">
        {[{ id: "", nome: "Padrão (balcão)" }, ...impressoras].map((i) => {
          const aceso = (atual ?? "") === i.id;
          return (
            <form key={i.id || "padrao"} action={salvar}>
              <input type="hidden" name="restaurantId" value={restaurantId} />
              <input type="hidden" name="categoriaId" value={categoriaId} />
              <input type="hidden" name="impressoraId" value={i.id} />
              <button
                type="submit"
                aria-pressed={aceso}
                className={cn(
                  "flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-bold transition-colors",
                  aceso ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface-2 text-muted hover:text-ink",
                )}
              >
                <Printer className="size-4 shrink-0" aria-hidden="true" />
                {i.nome}
              </button>
            </form>
          );
        })}
      </div>
      {estado.error && (
        <p className="text-sm font-bold text-danger" role="status">
          {estado.error}
        </p>
      )}
    </li>
  );
}
