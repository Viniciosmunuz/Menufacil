"use client";

import Image from "next/image";

import { LogoIcon } from "@/components/brand/logo";
import { cn } from "@/lib/cn";

// A capa como o cliente vê, dentro do painel.
//
// Substituiu um desenho cinza de "onde pode e onde não pode". O desenho
// explicava a regra; isto mostra o resultado -- e banner é coisa de
// olhar, não de deduzir. Com a arte de verdade aqui, o dono vê antes de
// publicar que a letra do canto sumiu no corte ou foi parar atrás da
// logo, que era a reclamação.
//
// **As medidas são as mesmas do cardápio, não parecidas.** A faixa tem
// a altura real (88px), a imagem entra com `object-cover` como lá, a
// logo tem o tamanho real e avança por cima pelo mesmo tanto. Uma
// prévia em outra proporção seria pior que nenhuma: diria que cabe o
// que não cabe.

/** a largura do celular em que a conta foi medida */
const LARGURA = 360;

export function PreviaDaCapa({
  imagem,
  logoUrl,
  nome,
  vazia,
}: {
  imagem: string | null;
  logoUrl: string | null;
  nome: string;
  /** o texto de quando não há banner nenhum para mostrar */
  vazia?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="relative overflow-hidden rounded-card border border-line bg-surface-2"
        style={{ width: LARGURA, maxWidth: "100%" }}
      >
        {/* a faixa, na altura exata que o cliente tem no celular */}
        <div className="relative h-[5.5rem] w-full overflow-hidden bg-surface-3">
          {imagem ? (
            <Image src={imagem} alt="" fill sizes="360px" className="object-cover" />
          ) : (
            <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_70%_30%,rgb(249_104_11/0.25),transparent_60%)]">
              <LogoIcon className="h-10 opacity-50" />
            </div>
          )}
          {/* o mesmo véu do cardápio: ele escurece as pontas, e é parte
              do motivo de uma letra clara no alto sumir */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-bg/70 via-transparent to-bg/30"
            aria-hidden="true"
          />
        </div>

        {/* A logo, do tamanho real e avançando por cima pelo mesmo
            tanto. A linha é um pouco mais alta do que o que sobra dela
            para baixo: rente, a borda do cartão cortava o círculo e a
            prévia mostrava uma logo meia-lua que o cliente não vê. */}
        <div className="relative -mt-8 h-12 px-4">
          <span className="relative grid size-16 place-items-center overflow-hidden rounded-full border-4 border-bg bg-surface-3 shadow-lg">
            {logoUrl ? (
              <Image src={logoUrl} alt={`Logo de ${nome}`} fill sizes="64px" className="object-cover" />
            ) : (
              <LogoIcon className="h-7" />
            )}
          </span>
        </div>
      </div>

      {vazia && <p className={cn("text-xs text-faint")}>{vazia}</p>}
    </div>
  );
}
