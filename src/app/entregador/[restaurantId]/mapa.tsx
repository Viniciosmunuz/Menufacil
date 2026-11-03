"use client";

import "leaflet/dist/leaflet.css";

import { Clock, Crosshair, Navigation } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { buttonClasses } from "@/components/ui/button";
import { ATRIBUICAO, CLASSE_DOS_LADRILHOS, COR_DA_MOTO, COR_DO_DESTINO, LADRILHOS } from "@/lib/mapa";
import { tempoEmPalavras, useRota } from "@/lib/rota-no-mapa";

// O mapa da entrega, na tela do entregador.
//
// Mostra o destino e onde ele está, e a linha reta entre os dois -- linha
// pelas ruas é serviço pago, e para "estou perto?" a reta já responde. Quem
// guia de verdade é o botão "Iniciar navegação", que abre o Google Maps ou
// o Waze do próprio celular, com voz e trânsito.
//
// O alfinete do destino só existe quando o endereço do cliente pôde ser
// convertido em coordenadas. Sem ele, o mapa mostra só onde o entregador
// está, e o endereço escrito continua logo acima.

const motoIcon = (L: typeof import("leaflet")) =>
  L.divIcon({
    className: "",
    html: `<span style="display:grid;place-items:center;width:38px;height:38px;border-radius:9999px;background:${COR_DA_MOTO};box-shadow:0 2px 10px rgba(0,0,0,.35);color:#fff;font-size:19px">🛵</span>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });

const casaIcon = (L: typeof import("leaflet")) =>
  L.divIcon({
    className: "",
    html: `<span style="display:grid;place-items:center;width:34px;height:34px;border-radius:9999px;background:${COR_DO_DESTINO};box-shadow:0 2px 8px rgba(0,0,0,.3);color:#fff;font-size:17px">🏠</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

export function MapaDoEntregador({
  destino,
  rota,
  code,
  fundo = false,
}: {
  destino: { lat: number; lng: number } | null;
  /** o link que abre a navegação no mapa do próprio celular */
  rota: string;
  /** o código do pedido, que é por onde se pede o caminho pelas ruas */
  code: string;
  /**
   * Mapa de fundo, ocupando a tela toda.
   *
   * É como os aplicativos de corrida mostram uma viagem em andamento: o
   * mapa é o chão, e o que se toca flutua por cima. Quem está com a moto
   * ligada olha para onde vai, e não para uma lista.
   *
   * Nesse modo os botões saem daqui -- quem os desenha é a tela, por cima
   * do mapa.
   */
  fundo?: boolean;
}) {
  const [minha, setMinha] = useState<[number, number] | null>(null);
  // o caminho pelas ruas, quando o serviço de rotas está configurado
  const caminho = useRota(code, minha, !!destino);
  const caixa = useRef<HTMLDivElement>(null);
  const mapa = useRef<import("leaflet").Map | null>(null);
  const eu = useRef<import("leaflet").Marker | null>(null);
  const casa = useRef<import("leaflet").Marker | null>(null);
  const linha = useRef<import("leaflet").Polyline | null>(null);

  // onde ele está, acompanhando enquanto a tela fica aberta
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const vigia = navigator.geolocation.watchPosition(
      (p) => setMinha([p.coords.latitude, p.coords.longitude]),
      () => {
        // sem permissão: fica o destino sozinho no mapa
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );
    return () => navigator.geolocation.clearWatch(vigia);
  }, []);

  useEffect(() => {
    const centro = minha ?? (destino ? ([destino.lat, destino.lng] as [number, number]) : null);
    if (!centro || !caixa.current) return;
    let cancelado = false;

    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelado || !caixa.current) return;

      if (!mapa.current) {
        mapa.current = L.map(caixa.current, { zoomControl: false }).setView(centro, 15);
        L.tileLayer(LADRILHOS, { maxZoom: 19, attribution: ATRIBUICAO, className: CLASSE_DOS_LADRILHOS }).addTo(mapa.current);
      }

      if (destino) {
        const ponto: [number, number] = [destino.lat, destino.lng];
        if (!casa.current) casa.current = L.marker(ponto, { icon: casaIcon(L) }).addTo(mapa.current);
        else casa.current.setLatLng(ponto);
      }

      if (minha) {
        if (!eu.current) eu.current = L.marker(minha, { icon: motoIcon(L) }).addTo(mapa.current);
        else eu.current.setLatLng(minha);
      }

      if (minha && destino) {
        const extremos: [number, number][] = [minha, [destino.lat, destino.lng]];
        // com rota, a linha segue a rua e é cheia; sem rota, é a reta
        // tracejada -- o tracejado diz "isto é aproximado"
        const pontos = caminho?.caminho.length ? caminho.caminho : extremos;
        if (!linha.current) {
          linha.current = L.polyline(pontos, {
            color: COR_DA_MOTO,
            weight: caminho ? 5 : 3,
            opacity: caminho ? 0.9 : 0.7,
            dashArray: caminho ? undefined : "6 8",
          }).addTo(mapa.current);
        } else {
          linha.current.setLatLngs(pontos);
          linha.current.setStyle({ weight: caminho ? 5 : 3, opacity: caminho ? 0.9 : 0.7, dashArray: caminho ? undefined : "6 8" });
        }
        mapa.current.fitBounds(L.latLngBounds(extremos).pad(0.3));
      } else {
        mapa.current.panTo(centro);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [destino, minha, caminho]);

  useEffect(
    () => () => {
      mapa.current?.remove();
      mapa.current = null;
    },
    [],
  );

  const chegada = caminho && (
    <p className="flex items-center gap-1.5 rounded-full bg-bg/95 px-3 py-1.5 text-sm font-extrabold shadow-md">
      <Clock className="size-4 text-success" aria-hidden="true" />
      Chegada em {tempoEmPalavras(caminho.segundos)}
    </p>
  );

  if (fundo) {
    return (
      <>
        <div ref={caixa} className="absolute inset-0 isolate bg-[#0f1115]" aria-label="Mapa da entrega" />
        {chegada && <div className="absolute top-20 left-4 z-[1000]">{chegada}</div>}
      </>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      {/* isolate: o Leaflet usa z-index alto nos proprios niveis, e sem
          isto eles brigam com o aviso de tela cheia e passam por cima */}
      <div className="relative isolate">
        <div ref={caixa} className="mapa-escuro h-56 w-full overflow-hidden rounded-2xl border border-black/25 bg-[#0f1115] shadow-md shadow-black/5" aria-label="Mapa da entrega" />
        {chegada && <div className="absolute top-2 left-2">{chegada}</div>}
      </div>
      <div className="flex gap-2">
        <a href={rota} target="_blank" rel="noopener noreferrer" className={buttonClasses("primary", "lg", "flex-1")}>
          <Navigation className="size-5" aria-hidden="true" />
          Iniciar navegação
        </a>
        <button
          type="button"
          onClick={() =>
            navigator.geolocation?.getCurrentPosition(
              (p) => setMinha([p.coords.latitude, p.coords.longitude]),
              () => {
                // sem permissão: nada a fazer, o mapa segue como está
              },
              { enableHighAccuracy: true, timeout: 15_000 },
            )
          }
          aria-label="Centralizar onde eu estou"
          className="grid size-13 shrink-0 place-items-center rounded-control border border-line text-muted"
        >
          <Crosshair className="size-5" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
