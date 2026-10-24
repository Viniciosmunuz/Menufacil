"use client";

import { Pointer, ShieldCheck, Ticket, Zap } from "lucide-react";
import Image from "next/image";

import { APAGADO, Cenario, MarcaDoRestaurante } from "./cenario";

// A tela de descanso do totem: o que fica no tablet quando ninguém está
// pedindo.
//
// Ela existe por dois motivos. O primeiro é chamar quem passa: um tablet
// parado num cardápio pela metade não convida ninguém, e um cartaz que diz
// "toque na tela" convida. O segundo é esconder o rastro do cliente
// anterior -- categoria aberta, rolagem no meio do cardápio.
//
// É um modelo só, o mesmo em todo totem, no cenário claro (ver cenario.tsx):
// o que muda de um restaurante para outro é a logo, o nome e a foto de
// capa. Antes cada dono podia mandar o próprio cartaz; o modelo único deixa
// todos com o mesmo acabamento, e ninguém precisa desenhar nada.
//
// A foto é a capa do próprio restaurante, e não um prato bonito para todo
// mundo: a açaiteria do centro não pode anunciar picanha. Sem capa, ou no
// tablet deitado (onde não há altura para ela), a tela fica sem foto.
//
// Qualquer toque derruba a tela: não tem botão para procurar, porque quem
// chega não sabe que é um totem até encostar nele.

export function TotemDescanso({
  nome,
  logoUrl,
  capaUrl,
  aoTocar,
}: {
  nome: string;
  /** a foto de perfil do restaurante, a mesma do cardápio do link */
  logoUrl: string | null;
  capaUrl: string | null;
  aoTocar: () => void;
}) {
  return (
    <Cenario rotulo="Toque para fazer o seu pedido" aoTocar={aoTocar}>
      <MarcaDoRestaurante nome={nome} logoUrl={logoUrl} frase="Peça com mais praticidade" />

      {/* a mãozinha com os risquinhos laranja, chamando para o toque */}
      <span className="relative mt-[4vh] inline-grid animate-pulse place-items-center">
        <Pointer aria-hidden="true" strokeWidth={1.75} className="size-[min(12vw,7vh)]" />
        <span aria-hidden="true" className="absolute -top-[22%] left-1/2 h-[24%] w-1 -translate-x-1/2 rounded-full bg-brand" />
        <span aria-hidden="true" className="absolute -top-[10%] left-[8%] h-[22%] w-1 -rotate-45 rounded-full bg-brand" />
        <span aria-hidden="true" className="absolute -top-[10%] right-[8%] h-[22%] w-1 rotate-45 rounded-full bg-brand" />
      </span>

      <h1 className="mt-[2vh] leading-[1.05]">
        <span className="block text-[clamp(2.25rem,min(10vw,7vh),4.5rem)] font-extrabold tracking-tight">Toque na tela</span>
        <span className="block text-[clamp(1.6rem,min(7.5vw,5vh),3.25rem)] font-medium">para fazer seu pedido</span>
      </h1>
      <p className={`mt-[2vh] max-w-xl text-[clamp(1rem,min(3.8vw,2.6vh),1.4rem)] ${APAGADO}`}>
        Escolha seus pratos, pague no cartão ou no Pix e retire no balcão.
      </p>

      {capaUrl && (
        // só com altura de sobra: no tablet deitado a foto empurraria o resto
        <div className="relative mt-[3vh] hidden min-h-0 w-full max-w-xl flex-1 [@media(min-height:700px)]:block">
          <span aria-hidden="true" className="absolute top-[6%] -left-3 h-1 w-8 -rotate-[30deg] rounded-full bg-brand" />
          <span aria-hidden="true" className="absolute top-[18%] -left-5 h-1 w-6 rotate-[10deg] rounded-full bg-brand" />
          <span aria-hidden="true" className="absolute -right-3 bottom-[18%] h-1 w-8 rotate-[30deg] rounded-full bg-brand" />
          <div className="relative size-full max-h-[34vh] overflow-hidden rounded-[2rem] border-4 border-white shadow-[0_14px_40px_rgb(29_32_38/0.18)]">
            <Image src={capaUrl} alt="" fill priority sizes="(max-width: 768px) 100vw, 576px" className="object-cover" />
          </div>
        </div>
      )}

      {/* as três garantias do pé */}
      <ul
        className={`mt-[3vh] mb-[2vh] flex flex-wrap items-center justify-center gap-x-[4vw] gap-y-2 text-[clamp(0.8rem,min(3vw,2vh),1rem)] font-semibold ${APAGADO}`}
      >
        <li className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="size-[1.6em] text-brand" />
          Pagamento seguro
        </li>
        <li className="flex items-center gap-2">
          <Zap aria-hidden="true" className="size-[1.6em] text-brand" />
          Rápido e prático
        </li>
        <li className="flex items-center gap-2">
          <Ticket aria-hidden="true" className="size-[1.6em] text-brand" />
          Retire com a senha
        </li>
      </ul>
    </Cenario>
  );
}
