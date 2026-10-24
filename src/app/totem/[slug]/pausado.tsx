"use client";

import { useEffect, useState } from "react";

import { LogoIcon } from "@/components/brand/logo";

import { APAGADO, Cenario, MarcaDoRestaurante } from "./cenario";

// O totem pausado pelo dono.
//
// O dono liga a chave em Totem → Pausar o totem, no painel, e em segundos o
// balcão mostra "Em breve estaremos de volta" por cima de tudo. Não sai no
// toque, como a tela de descanso: enquanto estiver pausado, ninguém chega
// ao cardápio. E a tela não é a única trava -- o servidor também recusa
// cobrança nova (ver src/server/totem/api/pagamento.ts).
//
// A página do totem fica aberta o dia inteiro e só é montada de novo de
// tempos em tempos, então a pausa não pode esperar a próxima montagem: o
// totem pergunta ao servidor a cada quinze segundos e quando a tela volta a
// ficar à vista.

const CADA_MS = 15_000;

export function TotemPausa({
  slug,
  inicial,
  nome,
  logoUrl,
}: {
  slug: string;
  /** como estava quando a página foi montada */
  inicial: boolean;
  nome: string;
  logoUrl: string | null;
}) {
  const [pausado, setPausado] = useState(inicial);

  useEffect(() => {
    let vivo = true;
    const olhar = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch(`/api/totem/pausa?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
        if (!r.ok) return;
        const dado = (await r.json()) as { pausado?: boolean };
        if (vivo && typeof dado.pausado === "boolean") setPausado(dado.pausado);
      } catch {
        // sem rede: fica como estava até a próxima volta
      }
    };
    const relogio = setInterval(olhar, CADA_MS);
    document.addEventListener("visibilitychange", olhar);
    return () => {
      vivo = false;
      clearInterval(relogio);
      document.removeEventListener("visibilitychange", olhar);
    };
  }, [slug]);

  if (!pausado) return null;

  return (
    <Cenario rotulo="Totem pausado. Em breve estaremos de volta." porCima>
      <MarcaDoRestaurante nome={nome} logoUrl={logoUrl} frase="Seu pedido, mais fácil" />

      <h1 className="mt-[4vh] text-[clamp(2.25rem,min(9vw,6.5vh),4.25rem)] leading-[1.05] font-extrabold tracking-tight">
        Em breve
        <br />
        estaremos de volta!
      </h1>
      <p className={`mt-[2vh] max-w-xl text-[clamp(1rem,min(4vw,2.8vh),1.5rem)] ${APAGADO}`}>
        O totem está pausado no momento.
        <br />
        Aguarde um instante ou fale com o balcão.
      </p>

      <TotemDormindo />

      <p className={`mt-[2vh] text-[clamp(0.9rem,min(3.4vw,2.2vh),1.15rem)] font-semibold tracking-wide ${APAGADO}`}>
        Obrigado pela compreensão!
      </p>
      <span aria-hidden="true" className="mt-2 mb-[2vh] block h-1 w-14 rounded-full bg-brand" />
    </Cenario>
  );
}

/** o totem desenhado, de pé e dormindo, com o "zzz" e a mancha laranja atrás */
function TotemDormindo() {
  return (
    <div aria-hidden="true" className="relative mt-[3vh] h-[min(30vh,62vw)] min-h-0 shrink aspect-[4/5]">
      {/* a mancha de cor atrás */}
      <span className="absolute inset-x-[8%] top-[14%] bottom-[16%] rounded-[45%_55%_50%_50%] bg-brand/20" />

      {/* os risquinhos do lado */}
      <span className="absolute top-[22%] left-[6%] h-1.5 w-[12%] -rotate-[35deg] rounded-full bg-brand" />
      <span className="absolute top-[33%] left-[3%] h-1.5 w-[12%] rounded-full bg-brand" />
      <span className="absolute top-[44%] left-[6%] h-1.5 w-[12%] rotate-[25deg] rounded-full bg-brand" />

      {/* o "zzz", subindo da tela do totem, sem sair do desenho */}
      <span className="absolute top-[26%] right-[24%] text-[min(2.4vh,4.5vw)] leading-none font-extrabold text-[#1d2026]">z</span>
      <span className="absolute top-[13%] right-[11%] text-[min(3.2vh,6vw)] leading-none font-extrabold text-[#1d2026]">z</span>
      <span className="absolute top-0 -right-[2%] text-[min(4.2vh,8vw)] leading-none font-extrabold text-[#1d2026]">Z</span>

      {/* a tela do totem, com o logo no meio */}
      <span className="absolute top-[12%] left-[26%] grid h-[52%] w-[48%] place-items-center rounded-[10%] border-[6px] border-[#1d2026] bg-[#2b3036]">
        <LogoIcon className="size-1/2 text-brand" />
      </span>
      {/* a maquininha encostada do lado */}
      <span className="absolute top-[50%] left-[66%] h-[13%] w-[13%] rounded-[18%] border-4 border-[#1d2026] bg-[#3a4048]" />
      {/* o pé e a base */}
      <span className="absolute top-[63%] left-[44%] h-[28%] w-[12%] bg-[#1d2026]" />
      <span className="absolute top-[90%] left-[30%] h-[4%] w-[40%] rounded-md bg-[#1d2026]" />
      <span className="absolute top-[94%] left-[20%] h-[4%] w-[60%] rounded-[50%] bg-[#1d2026]/15" />
    </div>
  );
}
