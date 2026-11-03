"use client";

import "leaflet/dist/leaflet.css";

import { Crosshair, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ATRIBUICAO, CLASSE_DOS_LADRILHOS, COR_DO_DESTINO, LADRILHOS } from "@/lib/mapa";

// "Marque onde fica a sua casa".
//
// Existe por um motivo medido: o OpenStreetMap não tem os números das
// casas de cidade pequena. Em Presidente Figueiredo, procurar "Rua X, 123"
// não acha nada -- acha a rua, e o alfinete cai na quadra, não na porta.
//
// Quem sabe onde é a porta é o cliente. Então ele arrasta o alfinete uma
// vez, no pedido, e a partir daí o entregador vê o ponto certo e a rota
// chega até lá.
//
// Opcional de propósito: quem não quiser mexer no mapa manda o pedido do
// mesmo jeito, e aí vale o endereço escrito, como sempre valeu.

const ZOOM_PERTO = 17;

export function MarcarNoMapa({ centro }: { centro: { lat: number; lng: number } | null }) {
  const [ponto, setPonto] = useState<{ lat: number; lng: number } | null>(null);
  const [abriu, setAbriu] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const mapa = useRef<import("leaflet").Map | null>(null);
  const alfinete = useRef<import("leaflet").Marker | null>(null);

  useEffect(() => {
    if (!abriu || !caixa.current) return;
    let cancelado = false;

    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelado || !caixa.current || mapa.current) return;

      // sem o restaurante traduzido, o mapa começa no Brasil inteiro e o
      // cliente aproxima; com ele, começa na rua do restaurante
      const inicio: [number, number] = centro ? [centro.lat, centro.lng] : [-14.24, -51.93];
      mapa.current = L.map(caixa.current, { zoomControl: true }).setView(inicio, centro ? ZOOM_PERTO : 4);
      L.tileLayer(LADRILHOS, { maxZoom: 19, attribution: ATRIBUICAO, className: CLASSE_DOS_LADRILHOS }).addTo(mapa.current);

      const icone = L.divIcon({
        className: "",
        html: `<span style="display:grid;place-items:center;width:34px;height:34px;border-radius:9999px;background:${COR_DO_DESTINO};box-shadow:0 2px 8px rgba(0,0,0,.4);color:#fff;font-size:17px">🏠</span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      alfinete.current = L.marker(inicio, { icon: icone, draggable: true }).addTo(mapa.current);
      alfinete.current.on("dragend", () => {
        const onde = alfinete.current!.getLatLng();
        setPonto({ lat: onde.lat, lng: onde.lng });
      });
      // tocar no mapa também move o alfinete: arrastar um marcador pequeno
      // com o dedo é difícil, e tocar é o gesto que todo mundo tenta antes
      mapa.current.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        alfinete.current?.setLatLng(e.latlng);
        setPonto({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
      if (centro) setPonto(centro);
    })();

    return () => {
      cancelado = true;
    };
  }, [abriu, centro]);

  useEffect(
    () => () => {
      mapa.current?.remove();
      mapa.current = null;
    },
    [],
  );

  const irParaMim = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => {
        const onde = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPonto(onde);
        alfinete.current?.setLatLng(onde);
        mapa.current?.setView(onde, ZOOM_PERTO);
      },
      () => {
        // sem permissão: ele arrasta o alfinete na mão
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );

  return (
    <div className="flex flex-col gap-3 sm:col-span-6">
      {/* o valor que vai junto com o pedido */}
      {ponto && <input type="hidden" name="destinoLat" value={ponto.lat.toFixed(6)} />}
      {ponto && <input type="hidden" name="destinoLng" value={ponto.lng.toFixed(6)} />}

      {!abriu ? (
        <button
          type="button"
          onClick={() => setAbriu(true)}
          className="flex min-h-13 items-center justify-center gap-2 rounded-control border border-dashed border-line-strong px-4 font-bold text-muted"
        >
          <MapPin className="size-5 text-brand" aria-hidden="true" />
          Marcar no mapa onde fica a minha casa
        </button>
      ) : (
        <>
          <p className="text-sm text-muted">
            Toque no mapa ou arraste a casinha até a sua porta. Isso ajuda o entregador a chegar — é opcional.
          </p>
          <div ref={caixa} className="h-60 w-full overflow-hidden rounded-control border border-line" aria-label="Mapa para marcar a casa" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={irParaMim}
              className="flex min-h-11 items-center gap-2 rounded-control border border-line px-3.5 text-sm font-bold text-muted"
            >
              <Crosshair className="size-4" aria-hidden="true" />
              Usar minha localização
            </button>
            {ponto && <span className="text-sm font-bold text-success">Local marcado ✓</span>}
          </div>
        </>
      )}
    </div>
  );
}
