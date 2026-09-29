"use client";

import { BellRing, Check, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

// "Avisar neste celular": liga a notificação de pedido novo.
//
// O som que o painel toca só existe enquanto a tela está na frente — o
// Android congela página que não está aberta. A notificação vem por outro
// caminho: o aparelho se cadastra num serviço de push, o servidor manda o
// aviso para lá e o celular apita mesmo com o navegador fechado.
//
// Quem manda no ligado/desligado é o próprio navegador, não o banco: por
// isso, ao abrir, a gente pergunta a ele e reenvia o cadastro ao servidor.
// Assim um celular que já disse sim continua avisando, mesmo que o
// registro tenha se perdido do outro lado.

const CAMINHO_DO_SW = "/sw-avisos.js";
const ESCOPO = "/painel/";

type Estado = "carregando" | "indisponivel" | "bloqueado" | "desligado" | "ligado";

/** a chave vem em base64 de URL; o navegador quer bytes */
function chaveEmBytes(base64: string) {
  const completo = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const cru = atob(completo);
  return Uint8Array.from([...cru].map((c) => c.charCodeAt(0)));
}

/** as chaves da assinatura, em base64, do jeito que o servidor guarda */
function chavesDa(assinatura: PushSubscription) {
  const json = assinatura.toJSON();
  const { p256dh, auth } = json.keys ?? {};
  return p256dh && auth ? { endpoint: assinatura.endpoint, p256dh, auth } : null;
}

/** "Android · Chrome", só para o dono reconhecer o aparelho depois */
function apelidoDoAparelho() {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  const sistema = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iPhone" : /Windows/i.test(ua) ? "Windows" : "Computador";
  const navegador = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "navegador";
  return `${sistema} · ${navegador}`;
}

export function PushAvisos({
  restaurantId,
  chavePublica,
  ligarAction,
  desligarAction,
  testarAction,
}: {
  restaurantId: string;
  /** null quando o servidor não tem as chaves configuradas: o bloco some */
  chavePublica: string | null;
  ligarAction: (entrada: { restaurantId: string; endpoint: string; p256dh: string; auth: string; label?: string }) => Promise<void>;
  desligarAction: (entrada: { restaurantId: string; endpoint: string }) => Promise<void>;
  testarAction: (restaurantId: string) => Promise<{ enviados: number }>;
}) {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [erro, setErro] = useState<string | null>(null);
  const [testado, setTestado] = useState(false);
  const [pendente, iniciar] = useTransition();

  // ao abrir: o que este navegador já decidiu?
  useEffect(() => {
    let vivo = true;
    (async () => {
      const suportado =
        !!chavePublica && typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!suportado) return vivo && setEstado("indisponivel");
      if (Notification.permission === "denied") return vivo && setEstado("bloqueado");
      try {
        const registro = await navigator.serviceWorker.getRegistration(ESCOPO);
        const assinatura = await registro?.pushManager.getSubscription();
        const chaves = assinatura && chavesDa(assinatura);
        if (!chaves || Notification.permission !== "granted") return vivo && setEstado("desligado");
        // já estava ligado: reforça o cadastro no servidor, de graça
        await ligarAction({ restaurantId, ...chaves, label: apelidoDoAparelho() ?? undefined });
        if (vivo) setEstado("ligado");
      } catch {
        if (vivo) setEstado("desligado");
      }
    })();
    return () => {
      vivo = false;
    };
    // só na montagem: o resto é comandado pelos botões
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, chavePublica]);

  async function ligar() {
    setErro(null);
    const permissao = await Notification.requestPermission();
    if (permissao === "denied") return setEstado("bloqueado");
    if (permissao !== "granted") return;

    const registro = await navigator.serviceWorker.register(CAMINHO_DO_SW, { scope: ESCOPO });
    await navigator.serviceWorker.ready;
    const assinatura = await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: chaveEmBytes(chavePublica!),
    });
    const chaves = chavesDa(assinatura);
    if (!chaves) throw new Error("o navegador não devolveu as chaves do aviso");
    await ligarAction({ restaurantId, ...chaves, label: apelidoDoAparelho() ?? undefined });
    setEstado("ligado");
  }

  async function desligar() {
    const registro = await navigator.serviceWorker.getRegistration(ESCOPO);
    const assinatura = await registro?.pushManager.getSubscription();
    if (assinatura) {
      await desligarAction({ restaurantId, endpoint: assinatura.endpoint });
      await assinatura.unsubscribe().catch(() => {});
    }
    setEstado("desligado");
  }

  const tentar = (acao: () => Promise<void>) =>
    iniciar(async () => {
      try {
        await acao();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "não deu certo agora");
      }
    });

  if (estado === "carregando" || estado === "indisponivel") return null;

  if (estado === "bloqueado") {
    return (
      <p className="rounded-control border border-line bg-surface-2 px-4 py-3 text-sm text-muted">
        Este aparelho está com as notificações bloqueadas para o MenuFácil. Para receber aviso de pedido novo, libere nos ajustes do
        navegador (o cadeado ao lado do endereço) e volte aqui.
      </p>
    );
  }

  if (estado === "ligado") {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-control border border-success/30 bg-success/5 px-4 py-3 text-sm">
        <span className="flex items-center gap-2 font-bold text-success">
          <Check className="size-4 shrink-0" aria-hidden="true" />
          Avisando neste aparelho
        </span>
        <span className="text-muted">Pedido novo apita mesmo com o painel fechado.</span>
        <span className="ml-auto flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            disabled={pendente}
            onClick={() =>
              tentar(async () => {
                const { enviados } = await testarAction(restaurantId);
                setTestado(enviados > 0);
              })
            }
          >
            {testado ? "Enviado!" : "Testar"}
          </Button>
          <Button size="sm" variant="ghost" disabled={pendente} onClick={() => tentar(desligar)}>
            Desligar
          </Button>
        </span>
        {erro && <span className="w-full font-bold text-danger">Não deu certo: {erro}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-control border border-line bg-surface-2 px-4 py-3 text-sm">
      <BellRing className="size-5 shrink-0 text-brand" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block font-bold">Avisar neste aparelho</span>
        <span className="block text-muted">Pedido novo apita mesmo com o painel fechado ou a tela apagada.</span>
      </span>
      <Button size="sm" disabled={pendente} onClick={() => tentar(ligar)}>
        {pendente ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        Ligar avisos
      </Button>
      {erro && <span className="w-full font-bold text-danger">Não deu certo: {erro}</span>}
    </div>
  );
}
