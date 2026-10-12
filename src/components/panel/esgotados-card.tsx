"use client";

import { ChevronDown, PackageX } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Card } from "@/components/ui/card";
import { SwitchButton } from "@/components/ui/switch-button";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export type Esgotado = { id: string; nome: string; secao: string | null };

// O que acabou, e o caminho de volta.
//
// Marcar esgotado é fácil no meio do movimento; religar é o que todo mundo
// esquece, porque exigia ir ao cardápio, achar o produto e voltar -- por um
// toque. Então a lista inteira abre aqui, com o mesmo interruptor do
// cardápio ao lado de cada nome: chegou a mercadoria, liga e pronto.
//
// A gaveta nasce fechada porque isto é um aviso, não uma tarefa: quem está
// olhando a tela inicial quer saber que falta alguma coisa, e só às vezes
// resolver agora.

export function EsgotadosCard({
  esgotados,
  cardapioHref,
  toggleAction,
  restaurantId,
}: {
  esgotados: Esgotado[];
  cardapioHref: string;
  toggleAction: (formData: FormData) => Promise<void>;
  restaurantId: string;
}) {
  const [aberta, setAberta] = useState(false);
  if (esgotados.length === 0) return null;

  const um = esgotados.length === 1;

  return (
    <Card className="flex flex-col gap-3 border-warning/40">
      {/* o texto pede 12rem antes de aceitar comprimir: sem isso, no celular
          "4 produtos esgotados" quebrava em três linhas para o botão caber
          ao lado. Não cabendo, o botão e a seta descem inteiros. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-control bg-warning/15 text-warning">
          <PackageX className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 basis-48">
          <p className="font-extrabold">
            {um ? (
              <>
                <span>{esgotados[0].nome}</span> <span className="font-semibold text-muted">está esgotado</span>
              </>
            ) : (
              `${esgotados.length} produtos esgotados`
            )}
          </p>
          <p className="truncate text-sm text-muted">
            {um
              ? "Não aparece para o cliente. Chegou mercadoria?"
              : `${esgotados.map((p) => p.nome).join(", ")} — não aparecem para o cliente.`}
          </p>
        </div>

        {um ? (
          <form action={toggleAction}>
            <input type="hidden" name="restaurantId" value={restaurantId} />
            <input type="hidden" name="id" value={esgotados[0].id} />
            <input type="hidden" name="field" value="available" />
            <SwitchButton checked={false} label="Religar" />
          </form>
        ) : (
          <div className="flex shrink-0 items-center gap-1">
            <Link href={cardapioHref} className={buttonClasses("secondary", "sm")}>
              Ver cardápio
            </Link>
            {/* a seta ao lado: a lista inteira sem sair da tela */}
            <button
              type="button"
              onClick={() => setAberta((a) => !a)}
              aria-expanded={aberta}
              aria-label={aberta ? "Fechar a lista de esgotados" : "Ver todos os esgotados"}
              className="grid size-9 place-items-center rounded-control border border-line text-muted hover:text-ink"
            >
              <ChevronDown className={cn("size-4 transition-transform", aberta && "rotate-180")} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {aberta && !um && (
        <ul className="flex flex-col divide-y divide-line border-t border-line pt-1">
          {esgotados.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-1">
              <span className="min-w-0">
                <span className="block truncate font-bold">{p.nome}</span>
                {p.secao && <span className="block truncate text-xs text-faint">{p.secao}</span>}
              </span>
              <form action={toggleAction} className="shrink-0">
                <input type="hidden" name="restaurantId" value={restaurantId} />
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="field" value="available" />
                <SwitchButton checked={false} label="Religar" />
              </form>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
