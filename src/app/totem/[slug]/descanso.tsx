"use client";

import Image from "next/image";

import { LogoIcon } from "@/components/brand/logo";

// A tela de descanso do totem: o que fica no tablet quando ninguém está
// pedindo.
//
// Ela existe por dois motivos. O primeiro é chamar quem passa: um tablet
// parado num cardápio pela metade não convida ninguém, e um cartaz que diz
// "faça aqui o seu pedido" convida. O segundo é esconder o rastro do
// cliente anterior -- categoria aberta, rolagem no meio do cardápio.
//
// São dois jeitos de montar, nesta ordem:
//
// 1. O cartaz que o dono mandou no painel, se ele mandou. Aí é a arte dele
//    e ela aparece inteira, sem nada por cima: ninguém manda uma arte para
//    ver o canto dela cortado.
// 2. Sem cartaz, a tela se monta sozinha com a capa do restaurante -- a
//    mesma do cardápio do link -- e o nome dele. Era mais fácil usar uma
//    foto bonita de hambúrguer para todo mundo, mas aí a açaiteria do
//    centro anunciaria hambúrguer.
//
// Qualquer toque derruba a tela: não tem botão para procurar, porque quem
// chega não sabe que é um totem até encostar nele.

export function TotemDescanso({
  nome,
  cartazUrl,
  capaUrl,
  aoTocar,
}: {
  nome: string;
  /** a arte que o dono mandou; quando existe, é só ela na tela */
  cartazUrl: string | null;
  capaUrl: string | null;
  aoTocar: () => void;
}) {
  const convite = (
    <p className="animate-pulse text-center text-[clamp(1rem,4vw,1.5rem)] font-bold text-muted">
      Toque na tela para começar
    </p>
  );

  if (cartazUrl) {
    return (
      <Moldura aoTocar={aoTocar}>
        {/* object-contain, não cover: a arte do dono aparece inteira, seja
            ela em pé ou deitada, no tablet que for */}
        <Image src={cartazUrl} alt="" fill priority sizes="100vw" className="object-contain" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg/80 to-transparent px-6 pt-16 pb-[5vh]">
          {convite}
        </div>
      </Moldura>
    );
  }

  return (
    <Moldura aoTocar={aoTocar}>
      {/* as faixas em diagonal nos cantos */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-40 size-96 rotate-45 bg-gradient-to-br from-brand/35 to-transparent blur-2xl"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -bottom-40 size-96 rotate-45 bg-gradient-to-tl from-brand/35 to-transparent blur-2xl"
      />

      <div className="relative flex size-full flex-col items-center px-6 py-[5vh]">
        <div className="flex min-h-0 w-full max-w-xl flex-1 flex-col items-center">
          {/* a marca no alto */}
          <LogoIcon className="h-[8vh] max-h-24" />
          <p className="mt-3 text-[clamp(1.4rem,5vw,2.25rem)] leading-none font-extrabold tracking-tight">
            Menu<span className="text-brand">Fácil</span>
          </p>

          {/* a chamada */}
          <h1 className="mt-[3vh] text-center text-[clamp(2.25rem,10vw,4rem)] leading-[0.95] font-extrabold tracking-tight uppercase">
            Faça aqui
            <br />
            <span className="text-brand">o seu pedido!</span>
          </h1>

          {/* o traço com o ponto no meio */}
          <span aria-hidden="true" className="mt-[2.5vh] flex w-full max-w-sm items-center gap-3">
            <span className="h-1 flex-1 rounded-full bg-brand/60" />
            <span className="h-1.5 w-10 rounded-full bg-brand" />
            <span className="h-1 flex-1 rounded-full bg-brand/60" />
          </span>

          {/* a casa: a capa do restaurante, com o brilho da marca atrás */}
          <div className="relative mt-[3vh] flex min-h-0 w-full flex-1 items-center justify-center">
            <span aria-hidden="true" className="absolute inset-x-6 inset-y-0 rounded-[2rem] bg-brand/25 blur-3xl" />
            {/* a moldura toma o espaço que sobrar, sem proporção fixa: num
                tablet deitado ela fica baixa e larga, e o convite lá embaixo
                continua dentro da tela */}
            <div className="relative size-full overflow-hidden rounded-[1.75rem] border-2 border-brand/40 bg-surface-2">
              {capaUrl ? (
                <Image src={capaUrl} alt="" fill priority sizes="(max-width: 768px) 100vw, 640px" className="object-cover" />
              ) : (
                <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_50%_40%,rgb(249_104_11/0.25),transparent_65%)]">
                  <LogoIcon className="h-24 opacity-60" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg to-transparent p-4 pt-12">
                <p className="truncate text-center text-[clamp(1.25rem,5vw,2rem)] font-extrabold">{nome}</p>
              </div>
            </div>
          </div>

          <div className="mt-[3vh]">{convite}</div>
        </div>
      </div>
    </Moldura>
  );
}

/** a camada que cobre o cardápio e escuta o toque */
function Moldura({ aoTocar, children }: { aoTocar: () => void; children: React.ReactNode }) {
  return (
    <div
      onPointerDown={aoTocar}
      role="button"
      tabIndex={0}
      aria-label="Toque para fazer o seu pedido"
      className="fixed inset-0 z-[100] overflow-hidden bg-bg select-none"
    >
      {children}
    </div>
  );
}
