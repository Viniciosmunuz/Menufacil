import { ChefHat, Leaf, UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

import { LogoIcon } from "@/components/brand/logo";

// O cenário claro das telas de espera do totem: a de descanso ("toque na
// tela") e a de pausa ("em breve estaremos de volta").
//
// O resto do totem é escuro, e de propósito estas duas não são: são as
// telas que o totem mostra para quem está longe, e o fundo creme com a onda
// laranja embaixo chama mais do que mais uma tela preta no balcão. Os
// desenhos de talher e chapéu nos cantos são só traço, para não brigar com
// o texto.
//
// As cores ficam aqui, fixas: o tema do site é escuro e estas telas não o
// seguem.

export const TINTA = "text-[#1d2026]";
export const APAGADO = "text-[#5b6168]";

export function Cenario({
  children,
  rotulo,
  aoTocar,
  porCima = false,
}: {
  children: ReactNode;
  rotulo: string;
  aoTocar?: () => void;
  /** a pausa fica por cima até da tela de descanso */
  porCima?: boolean;
}) {
  return (
    <div
      onPointerDown={aoTocar}
      role={aoTocar ? "button" : "status"}
      tabIndex={aoTocar ? 0 : undefined}
      aria-label={rotulo}
      className={`fixed inset-0 ${porCima ? "z-[110]" : "z-[100]"} flex flex-col overflow-hidden bg-[#f6f1ea] select-none ${TINTA}`}
    >
      {/* as manchas de cor nos cantos */}
      <span aria-hidden="true" className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-brand/15 blur-sm" />
      <span aria-hidden="true" className="pointer-events-none absolute top-[30%] -right-32 size-64 rounded-full bg-[#f3e3cf]" />

      {/* os desenhos de traço */}
      <UtensilsCrossed
        aria-hidden="true"
        strokeWidth={1}
        className="pointer-events-none absolute top-[9vh] left-[5vw] size-[min(18vw,11vh)] text-[#1d2026]/15"
      />
      <ChefHat
        aria-hidden="true"
        strokeWidth={1}
        className="pointer-events-none absolute top-[22vh] right-[5vw] size-[min(16vw,10vh)] text-[#1d2026]/15"
      />
      <Leaf
        aria-hidden="true"
        strokeWidth={1}
        className="pointer-events-none absolute right-[6vw] bottom-[18vh] size-[min(16vw,10vh)] text-[#1d2026]/15"
      />

      <div className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center px-6 pt-[4vh] text-center">
        {children}
      </div>

      {/* a onda laranja do pé, com o "MenuFácil" dentro dela */}
      <div className="relative h-[9vh] min-h-16 shrink-0">
        <svg aria-hidden="true" viewBox="0 0 400 60" preserveAspectRatio="none" className="absolute inset-0 size-full">
          <path d="M0 22 C 90 0, 180 40, 270 18 S 370 8, 400 14 L400 60 L0 60 Z" fill="#F9680B" />
          <path d="M0 40 C 60 24, 120 30, 170 46 L170 60 L0 60 Z" fill="#1d2026" />
        </svg>
        <p className="absolute right-[6vw] bottom-[2.2vh] flex items-center gap-1.5 text-sm font-extrabold text-white">
          <LogoIcon className="size-4" />
          MenuFácil
        </p>
      </div>
    </div>
  );
}

/** a logo do restaurante, redonda, com o nome e a frase embaixo */
export function MarcaDoRestaurante({ nome, logoUrl, frase }: { nome: string; logoUrl: string | null; frase: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative grid size-[min(26vw,15vh)] place-items-center overflow-hidden rounded-full border-4 border-white bg-white shadow-[0_8px_30px_rgb(249_104_11/0.25)]">
        {logoUrl ? (
          <Image src={logoUrl} alt="" fill priority sizes="(max-width: 768px) 26vw, 200px" className="object-cover" />
        ) : (
          <LogoIcon className="size-1/2 text-brand" />
        )}
      </div>
      <p className="mt-[1.5vh] max-w-[90vw] truncate text-[clamp(1.4rem,min(6vw,4.5vh),2.5rem)] leading-tight font-extrabold tracking-tight">
        {nome}
      </p>
      <p className={`mt-1 text-[clamp(0.85rem,min(3vw,2.2vh),1.1rem)] font-semibold tracking-wide ${APAGADO}`}>{frase}</p>
    </div>
  );
}
