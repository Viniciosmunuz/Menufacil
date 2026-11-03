"use client";

import { useEffect, useRef, useState } from "react";

// O caminho pelas ruas, buscado do lado do navegador.
//
// Usado nas duas telas: a do cliente, que vê a moto chegando, e a do
// entregador, que vê para onde vai.
//
// **O acelerador é a parte importante.** O serviço de rotas tem cota, e a
// posição da moto chega de dez em dez segundos: pedir uma rota nova a cada
// posição gastaria 360 rotas por hora de entrega. Como a rua não muda, a
// rota só é refeita quando a moto andou de verdade -- 150 metros -- ou
// quando ainda não há rota nenhuma. Numa entrega de vinte minutos isso dá
// cerca de vinte pedidos, não trezentos.

/** "8 min", "1 h 05" */
export function tempoEmPalavras(segundos: number) {
  const minutos = Math.max(1, Math.round(segundos / 60));
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return `${horas} h ${String(minutos % 60).padStart(2, "0")}`;
}

export type RotaNoMapa = { caminho: [number, number][]; segundos: number; metros: number };

/** distância aproximada entre dois pontos, em metros */
function distancia(a: [number, number], b: [number, number]) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLng = (b[1] - a[1]) * rad;
  const meio = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(meio));
}

const ANDOU = 150;

export function useRota(code: string, de: [number, number] | null, temDestino: boolean) {
  const [rota, setRota] = useState<RotaNoMapa | null>(null);
  // de onde a rota de agora foi traçada
  const origem = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (!de || !temDestino) return;
    if (origem.current && distancia(origem.current, de) < ANDOU) return;

    let vivo = true;
    origem.current = de;
    fetch(`/api/rota?code=${encodeURIComponent(code)}&de=${de[0]},${de[1]}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((r: { rota: RotaNoMapa | null }) => {
        if (!vivo) return;
        // sem rota (sem chave, sem cota, serviço fora): o mapa fica na reta
        setRota(r?.rota ?? null);
      })
      .catch(() => {
        if (vivo) setRota(null);
      });

    return () => {
      vivo = false;
    };
  }, [code, de, temDestino]);

  return rota;
}
