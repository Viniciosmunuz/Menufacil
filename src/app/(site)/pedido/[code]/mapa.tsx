"use client";

import "leaflet/dist/leaflet.css";

import { Bike, Crosshair, Phone } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { ATRIBUICAO, COR_DA_MOTO, COR_DO_DESTINO, LADRILHOS } from "@/lib/mapa";

// O mapa com a moto se mexendo, na tela que o cliente já acompanha.
//
// Aparece só enquanto o pedido está na rua: antes não há o que mostrar, e
// depois de entregue a moto some. Quem decide isso é o servidor, em
// /api/pedido/[code]/entregador -- a tela só pergunta.
//
// Mapa do OpenStreetMap, sem chave e sem cobrança por abertura. Não há
// linha seguindo as ruas: traçar rota de verdade é serviço pago, e o que o
// cliente quer saber -- está perto? está vindo? -- a moto andando já diz.
//
// "Onde eu estou" é opcional e fica no navegador do cliente: ele toca,
// permite, e o mapa passa a mostrar os dois. Não guardamos esse ponto.

type Situacao = {
  emRota: boolean;
  nome?: string;
  fotoUrl?: string | null;
  moto?: string | null;
  placa?: string | null;
  lat?: number | null;
  lng?: number | null;
  em?: string | null;
  /** a casa do cliente, quando o endereço pôde virar coordenadas */
  destino?: { lat: number; lng: number } | null;
};

const INTERVALO = 12_000;

/** o ícone da moto, desenhado em HTML para não precisar de imagem */
const motoIcon = (L: typeof import("leaflet")) =>
  L.divIcon({
    className: "",
    html: `<span style="display:grid;place-items:center;width:40px;height:40px;border-radius:9999px;background:${COR_DA_MOTO};box-shadow:0 2px 10px rgba(0,0,0,.35);color:#fff;font-size:20px">🛵</span>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

const casaIcon = (L: typeof import("leaflet")) =>
  L.divIcon({
    className: "",
    html: `<span style="display:grid;place-items:center;width:32px;height:32px;border-radius:9999px;background:${COR_DO_DESTINO};box-shadow:0 2px 8px rgba(0,0,0,.3);color:#fff;font-size:16px">🏠</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

export function MapaDaEntrega({
  code,
  telefone,
  inicial,
}: {
  code: string;
  telefone: string | null;
  /** o que o servidor já sabe: a ficha aparece na hora, sem esperar a primeira pergunta */
  inicial: { nome: string; fotoUrl: string | null; moto: string | null; placa: string | null };
}) {
  const [situacao, setSituacao] = useState<Situacao>({ emRota: true, ...inicial });
  const [minhaPos, setMinhaPos] = useState<[number, number] | null>(null);
  const casaLat = situacao.destino?.lat ?? null;
  const casaLng = situacao.destino?.lng ?? null;
  const caixa = useRef<HTMLDivElement>(null);
  const mapa = useRef<import("leaflet").Map | null>(null);
  const marcadorMoto = useRef<import("leaflet").Marker | null>(null);
  const marcadorCasa = useRef<import("leaflet").Marker | null>(null);
  const linha = useRef<import("leaflet").Polyline | null>(null);
  const leaflet = useRef<typeof import("leaflet") | null>(null);

  // pergunta de tempos em tempos onde ele está
  useEffect(() => {
    let vivo = true;
    const perguntar = () => {
      fetch(`/api/pedido/${code}/entregador`, { cache: "no-store" })
        .then((r) => r.json())
        .then((s: Situacao) => vivo && setSituacao(s))
        .catch(() => {
          // sem internet agora: a próxima volta responde
        });
    };
    perguntar();
    const relogio = setInterval(perguntar, INTERVALO);
    return () => {
      vivo = false;
      clearInterval(relogio);
    };
  }, [code]);

  // o mapa nasce quando chega a primeira posição, e não antes: carregar a
  // biblioteca para depois descobrir que não há o que mostrar é peso à toa
  // na internet de quem está esperando comida
  useEffect(() => {
    const pos = situacao?.lat != null && situacao?.lng != null ? ([situacao.lat, situacao.lng] as [number, number]) : null;
    if (!pos || !caixa.current) return;
    let cancelado = false;

    void (async () => {
      const L = leaflet.current ?? (await import("leaflet")).default;
      if (cancelado || !caixa.current) return;
      leaflet.current = L;

      if (!mapa.current) {
        // Mapa travado: o cliente olha, não mexe.
        //
        // Sem arrastar, sem pinça, sem rolar com o dedo -- quem está
        // esperando comida quer ver a moto chegando, e um mapa que se
        // move engole a rolagem da página e deixa a pessoa presa nele.
        // O enquadramento é nosso: a moto e a casa sempre à vista.
        mapa.current = L.map(caixa.current, {
          zoomControl: false,
          attributionControl: true,
          dragging: false,
          touchZoom: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
        }).setView(pos, 15);
        L.tileLayer(LADRILHOS, { maxZoom: 19, attribution: ATRIBUICAO }).addTo(mapa.current);
        marcadorMoto.current = L.marker(pos, { icon: motoIcon(L) }).addTo(mapa.current);
      } else {
        marcadorMoto.current?.setLatLng(pos);
      }

      // a casa do pedido serve de destino quando o cliente não quis dar a dele
      const casaDoPedido = casaLat != null && casaLng != null ? ([casaLat, casaLng] as [number, number]) : null;
      const alvo = minhaPos ?? casaDoPedido;
      if (alvo) {
        if (!marcadorCasa.current) marcadorCasa.current = L.marker(alvo, { icon: casaIcon(L) }).addTo(mapa.current);
        else marcadorCasa.current.setLatLng(alvo);

        const pontos: [number, number][] = [pos, alvo];
        if (!linha.current) {
          linha.current = L.polyline(pontos, { color: COR_DA_MOTO, weight: 3, opacity: 0.7, dashArray: "6 8" }).addTo(mapa.current);
        } else {
          linha.current.setLatLngs(pontos);
        }
        mapa.current.fitBounds(L.latLngBounds(pontos).pad(0.35));
      } else {
        mapa.current.panTo(pos);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [situacao?.lat, situacao?.lng, minhaPos, casaLat, casaLng]);

  // o mapa morre junto com a tela
  useEffect(
    () => () => {
      mapa.current?.remove();
      mapa.current = null;
    },
    [],
  );

  if (!situacao.emRota) return null;
  const temMapa = situacao.lat != null && situacao.lng != null;

  return (
    <section className="flex flex-col gap-3 rounded-card border border-success/40 bg-surface p-4">
      <div className="flex items-center gap-4">
        {situacao.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- retrato pequeno, já recortado no envio
          <img src={situacao.fotoUrl} alt="" className="size-14 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-success/12 text-success">
            <Bike className="size-6" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-bold text-success">
            <Bike className="size-4" aria-hidden="true" />
            Seu pedido está a caminho
          </p>
          <p className="text-lg font-extrabold">{situacao.nome}</p>
          {(situacao.moto || situacao.placa) && (
            <p className="text-sm text-muted">{[situacao.moto, situacao.placa].filter(Boolean).join(" · ")}</p>
          )}
        </div>
        {telefone && (
          <a
            href={`tel:+${telefone}`}
            aria-label={`Ligar para ${situacao.nome}`}
            className="grid size-12 shrink-0 place-items-center rounded-full bg-success/12 text-success"
          >
            <Phone className="size-5" aria-hidden="true" />
          </a>
        )}
      </div>

      {temMapa ? (
        <>
          <div ref={caixa} className="h-64 w-full mapa-escuro overflow-hidden rounded-control border border-ink/20 bg-ink" aria-label="Mapa da entrega" />
          <button
            type="button"
            onClick={() =>
              navigator.geolocation?.getCurrentPosition(
                (p) => setMinhaPos([p.coords.latitude, p.coords.longitude]),
                () => {
                  // sem permissão: o mapa continua mostrando só a moto
                },
                { enableHighAccuracy: true, timeout: 15_000 },
              )
            }
            className={cn(
              "flex items-center justify-center gap-2 rounded-control border border-line px-4 py-2 text-sm font-bold text-muted",
              minhaPos && "hidden",
            )}
          >
            <Crosshair className="size-4" aria-hidden="true" />
            Mostrar onde eu estou
          </button>
        </>
      ) : (
        <p className="text-sm text-muted">
          O mapa aparece assim que o celular do entregador começar a mandar a localização. Ele já saiu com o seu pedido.
        </p>
      )}
    </section>
  );
}
