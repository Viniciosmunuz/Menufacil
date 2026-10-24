"use client";

import { Hand } from "lucide-react";
import Image from "next/image";

import { LogoIcon } from "@/components/brand/logo";

// A tela de descanso do totem: o que fica no tablet quando ninguém está
// pedindo.
//
// Ela existe por dois motivos. O primeiro é chamar quem passa: um tablet
// parado num cardápio pela metade não convida ninguém, e um cartaz que diz
// "toque para pedir" convida. O segundo é esconder o rastro do cliente
// anterior -- categoria aberta, rolagem no meio do cardápio.
//
// É um modelo só, o mesmo em todo totem: o que muda de um restaurante para
// outro é a logo e o nome dele. Antes cada dono podia mandar o próprio
// cartaz, e o totem de cada um ficava com uma cara; o modelo único deixa
// todos com o mesmo acabamento, e ninguém precisa desenhar nada.
//
// Sem logo cadastrada, entra o ícone do Menu Fácil no lugar dela.
//
// Qualquer toque derruba a tela: não tem botão para procurar, porque quem
// chega não sabe que é um totem até encostar nele.

export function TotemDescanso({
  nome,
  logoUrl,
  aoTocar,
}: {
  nome: string;
  /** a foto de perfil do restaurante, a mesma do cardápio do link */
  logoUrl: string | null;
  aoTocar: () => void;
}) {
  return (
    <div
      onPointerDown={aoTocar}
      role="button"
      tabIndex={0}
      aria-label="Toque para fazer o seu pedido"
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-bg select-none"
    >
      {/* as faixas em diagonal nos cantos */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-40 size-96 rotate-45 bg-gradient-to-br from-brand/35 to-transparent blur-2xl"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -bottom-40 size-96 rotate-45 bg-gradient-to-tl from-brand/35 to-transparent blur-2xl"
      />

      <div className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center px-6 pt-[5vh] text-center">
        {/* a logo do restaurante, grande e redonda, com o brilho da marca atrás */}
        <div className="relative">
          <span aria-hidden="true" className="absolute -inset-6 rounded-full bg-brand/25 blur-3xl" />
          <div className="relative grid size-[min(42vw,30vh)] place-items-center overflow-hidden rounded-full border-4 border-brand/50 bg-surface-2">
            {logoUrl ? (
              <Image src={logoUrl} alt="" fill priority sizes="(max-width: 768px) 42vw, 320px" className="object-cover" />
            ) : (
              <LogoIcon className="size-1/2 text-brand" />
            )}
          </div>
        </div>

        <p className="mt-[4vh] max-w-full truncate text-[clamp(1.5rem,min(7vw,6vh),3rem)] leading-none font-extrabold tracking-tight">
          {nome}
        </p>

        {/* o traço com o ponto no meio */}
        <span aria-hidden="true" className="mt-[3vh] flex w-full max-w-xs items-center gap-3">
          <span className="h-1 flex-1 rounded-full bg-brand/60" />
          <span className="h-1.5 w-10 rounded-full bg-brand" />
          <span className="h-1 flex-1 rounded-full bg-brand/60" />
        </span>

        <h1 className="mt-[3vh] text-[clamp(2rem,min(10vw,9vh),4.5rem)] leading-[0.95] font-extrabold tracking-tight uppercase">
          Faça aqui
          <br />
          <span className="text-brand">o seu pedido!</span>
        </h1>

        {/* o convite: o único pedaço que se mexe, para o olho achar */}
        <p className="mt-[5vh] flex animate-pulse items-center gap-3 rounded-full bg-brand px-8 py-4 text-[clamp(1rem,min(4.5vw,4vh),1.75rem)] font-extrabold text-brand-ink">
          <Hand className="size-[1.2em]" aria-hidden="true" />
          Toque para pedir
        </p>
      </div>

      {/* quem fez, discreto, no pé da tela -- no fluxo, e não por cima: no
          tablet deitado o convite chega perto do pé */}
      <p className="relative flex shrink-0 items-center justify-center gap-1.5 pt-[2vh] pb-[3vh] text-sm font-bold text-faint">
        <LogoIcon className="size-4" />
        <span>
          Menu<span className="text-brand">Fácil</span>
        </span>
      </p>
    </div>
  );
}
