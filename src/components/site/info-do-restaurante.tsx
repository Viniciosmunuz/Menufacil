"use client";

import { AtSign, CalendarClock, MapPin } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

// Endereço e horários, como duas bolinhas na fileira de "Entrega" e
// "Retirada".
//
// Antes era uma barra inteira, "Endereço, horários e pagamento", que
// ocupava uma linha do topo do cardápio para uma coisa que pouca gente
// abre. As bolinhas cabem na fileira que já existe: o alfinete abre o
// endereço (com a forma de pagamento junto) e o relógio abre os horários.
// Uma de cada vez, logo abaixo da fileira.

type Painel = "endereco" | "horarios" | null;

export function InfoDoRestaurante({
  selos,
  endereco,
  pagamento,
  instagram,
  horarios,
}: {
  /** os selos que já estavam na fileira: tempo, entrega, retirada, mínimo */
  selos: ReactNode;
  endereco: string | null;
  pagamento: string;
  instagram: string | null;
  horarios: { dia: string; texto: string; hoje: boolean }[];
}) {
  const [aberto, setAberto] = useState<Painel>(null);
  const alternar = (p: Exclude<Painel, null>) => setAberto((atual) => (atual === p ? null : p));

  const bolinha = (p: Exclude<Painel, null>, rotulo: string, icone: ReactNode) => (
    <button
      type="button"
      onClick={() => alternar(p)}
      aria-expanded={aberto === p}
      aria-label={rotulo}
      title={rotulo}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full border transition-colors [&_svg]:size-4",
        aberto === p ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface-2 text-brand hover:border-line-strong",
      )}
    >
      {icone}
    </button>
  );

  return (
    <>
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {selos}
        {bolinha("endereco", "Endereço e pagamento", <MapPin aria-hidden="true" />)}
        {horarios.length > 0 && bolinha("horarios", "Horários", <CalendarClock aria-hidden="true" />)}
      </div>

      {aberto === "endereco" && (
        <div className="mt-2 flex flex-col gap-3 rounded-card border border-line bg-surface px-4 py-4 text-sm text-muted">
          {endereco && (
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
              {endereco}
            </p>
          )}
          <p>
            <span className="font-bold text-ink">Pagamento:</span> {pagamento}.
          </p>
          {instagram && (
            <a
              href={`https://instagram.com/${instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-fit items-center gap-2 font-bold text-ink hover:text-brand"
            >
              <AtSign className="size-4 text-faint" aria-hidden="true" />
              {instagram}
            </a>
          )}
        </div>
      )}

      {aberto === "horarios" && (
        <div className="mt-2 rounded-card border border-line bg-surface px-4 py-3 text-sm">
          <table className="w-full">
            <tbody>
              {horarios.map((h) => (
                <tr key={h.dia} className={cn(h.hoje ? "font-extrabold text-ink" : "text-muted")}>
                  <td className="py-0.5 pr-4">{h.dia}</td>
                  <td className="py-0.5 text-right tabular-nums">{h.texto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
