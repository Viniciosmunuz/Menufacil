"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { COOKIE_DA_TELA, DIAS_DA_TELA } from "@/lib/ultima-tela";

// Anota em que seção do painel a pessoa está, para o atalho da tela inicial
// devolvê-la aqui na próxima vez.
//
// Não desenha nada. A gravação é no efeito, depois da tela pintada: é o
// navegador escrevendo o próprio cookie, fora do caminho de quem está
// esperando a página aparecer.

export function LembraATela() {
  const caminho = usePathname();

  useEffect(() => {
    const valor = encodeURIComponent(caminho);
    const idade = DIAS_DA_TELA * 24 * 60 * 60;
    document.cookie = `${COOKIE_DA_TELA}=${valor}; path=/; max-age=${idade}; samesite=lax`;
  }, [caminho]);

  return null;
}
