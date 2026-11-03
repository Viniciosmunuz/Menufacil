"use client";

import { useEffect, useRef, useState } from "react";

// O celular contando onde ele está, enquanto houver entrega na mão.
//
// Só liga com entrega em rota, e desliga sozinha quando a última acaba --
// a própria resposta do servidor avisa quando pode parar. Fora disso, onde
// o entregador está não é da conta de ninguém.
//
// **O limite que o navegador impõe:** com a tela apagada ou o aplicativo em
// segundo plano, o Android congela a página e a posição para de subir. Por
// isso a tela se segura acesa enquanto a entrega anda (o mesmo wakeLock que
// a impressão usa). A solução de verdade é o aplicativo Android pegar a
// localização por fora e chamar o mesmo /api/entregador/posicao -- este
// componente some no dia em que ele existir.

const INTERVALO = 10_000;

export function MandaPosicao({ ativo }: { ativo: boolean }) {
  const [negado, setNegado] = useState(false);
  const ultimaEnviada = useRef(0);

  useEffect(() => {
    if (!ativo || typeof navigator === "undefined" || !navigator.geolocation) return;
    let vivo = true;
    let lock: WakeLockSentinel | null = null;

    // a tela acesa é o que mantém a posição subindo; sem isso o Android
    // congela a página assim que ela sai da frente
    const segurarTela = async () => {
      if (!("wakeLock" in navigator)) return;
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        // bateria fraca ou aba escondida: o navegador recusa, e tudo bem
      }
    };
    void segurarTela();
    const aoVoltar = () => {
      if (document.visibilityState === "visible") void segurarTela();
    };
    document.addEventListener("visibilitychange", aoVoltar);

    const mandar = (pos: GeolocationPosition) => {
      const agora = Date.now();
      if (agora - ultimaEnviada.current < INTERVALO) return;
      ultimaEnviada.current = agora;
      void fetch("/api/entregador/posicao", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        keepalive: true,
      })
        .then((r) => r.json())
        .then((r: { emRota?: boolean }) => {
          // o servidor diz quando não há mais o que acompanhar
          if (vivo && r?.emRota === false) navigator.geolocation.clearWatch(vigia);
        })
        .catch(() => {
          // sem internet agora: a próxima posição vai
        });
    };

    const vigia = navigator.geolocation.watchPosition(
      mandar,
      (erro) => {
        if (erro.code === erro.PERMISSION_DENIED) setNegado(true);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20_000 },
    );

    return () => {
      vivo = false;
      navigator.geolocation.clearWatch(vigia);
      document.removeEventListener("visibilitychange", aoVoltar);
      void lock?.release().catch(() => {});
    };
  }, [ativo]);

  if (!ativo || !negado) return null;

  return (
    <p className="rounded-control border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
      Este celular não está deixando o MenuFácil ver a localização, então o cliente não acompanha você no mapa. Para liberar, toque no
      cadeado ao lado do endereço e permita a localização.
    </p>
  );
}
