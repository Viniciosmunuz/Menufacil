"use client";

import { QrCode, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { conectarWhatsapp, conferirWhatsapp, type EstadoDaConexao } from "./actions";

// Conectar o WhatsApp do restaurante lendo um QR Code, aqui mesmo.
//
// Até aqui isso era uma conversa com o suporte: alguém do MenuFácil criava
// o canal no painel do provedor, lia o QR e colava o identificador no
// admin. Para dois restaurantes vai; para vender, não -- é uma pessoa por
// cliente novo, e o cliente espera.
//
// O QR da uazapi **morre em menos de um minuto**. Por isso a tela não o
// mostra e esquece: ela pergunta de poucos em poucos segundos se já foi
// lido, e o provedor devolve o código novo quando ele troca. Sem isso o
// dono leria um código morto e acharia que o sistema está quebrado -- que
// é o pior jeito de alguém conhecer um recurso.

/** de quanto em quanto tempo perguntar se já leram, enquanto o QR está na tela */
const INTERVALO_MS = 4000;

/**
 * Por quanto tempo insistir antes de parar sozinho.
 *
 * Dois minutos é mais do que qualquer pessoa leva para pegar o celular e
 * ler um código. Passado isso, o mais provável é que a aba tenha ficado
 * aberta e esquecida -- e uma pergunta a cada quatro segundos para
 * sempre é conta de servidor que ninguém pediu.
 */
const DESISTE_MS = 120_000;

export function ConectarWhatsapp({
  restaurantId,
  /**
   * A conexão existe no provedor, mas o WhatsApp não está pareado.
   *
   * São dois casos com a mesma tela e recados diferentes: quem nunca
   * conectou precisa saber o que vai acontecer; quem já tinha conectado
   * precisa saber que **caiu**, senão fica procurando o que ele mesmo
   * desligou errado.
   */
  retomando = false,
}: {
  restaurantId: string;
  retomando?: boolean;
}) {
  const [estado, setEstado] = useState<EstadoDaConexao | null>(null);
  const [pendente, comecar] = useTransition();
  const desdeRef = useRef<number>(0);
  const [cansou, setCansou] = useState(false);

  const pedir = () => {
    setCansou(false);
    desdeRef.current = Date.now();
    comecar(async () => setEstado(await conectarWhatsapp(restaurantId)));
  };

  // A pergunta periódica, enquanto houver um QR na tela esperando leitura.
  useEffect(() => {
    if (!estado?.qrcode || estado.conectado || cansou) return;

    const id = setInterval(async () => {
      if (Date.now() - desdeRef.current > DESISTE_MS) {
        setCansou(true);
        return;
      }
      const novo = await conferirWhatsapp(restaurantId);
      // Resposta vazia não apaga o que está na tela: uma falha de rede no
      // meio da leitura sumiria com o QR debaixo dos olhos de quem está
      // apontando a câmera para ele.
      if (novo.conectado || novo.qrcode) setEstado(novo);
    }, INTERVALO_MS);

    return () => clearInterval(id);
  }, [estado?.qrcode, estado?.conectado, cansou, restaurantId]);

  if (estado?.conectado) {
    return (
      <Alert tone="success">
        WhatsApp conectado! Atualize a página para ligar o atendente.
      </Alert>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3">
      {estado?.error && <Alert tone="danger">{estado.error}</Alert>}

      {!estado?.qrcode ? (
        <>
          <p className="text-sm text-muted">
            {retomando
              ? "O WhatsApp deste restaurante não está conectado. Leia o QR Code de novo com o celular do restaurante para a Lia voltar a responder."
              : "Conecte o WhatsApp do restaurante lendo um QR Code, como no WhatsApp Web. Tenha o celular do restaurante em mãos."}
          </p>
          <Button onClick={pedir} disabled={pendente} variant="secondary" size="sm">
            <QrCode className="size-4" aria-hidden="true" />
            {pendente ? "Gerando…" : retomando ? "Ler o QR Code" : "Conectar WhatsApp"}
          </Button>
        </>
      ) : (
        <>
          <ol className="flex flex-col gap-1 text-sm text-muted">
            <li>1. Abra o WhatsApp no celular do restaurante</li>
            <li>2. Toque em Configurações → Aparelhos conectados</li>
            <li>3. Toque em Conectar um aparelho e aponte para o código</li>
          </ol>

          {/* O QR vem em base64 do provedor. Fundo branco fixo de propósito:
              no tema escuro, um QR com fundo transparente fica ilegível para
              a câmera -- e o erro só apareceria com alguém tentando. */}
          <div className="rounded-control border border-line bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={estado.qrcode.startsWith("data:") ? estado.qrcode : `data:image/png;base64,${estado.qrcode}`}
              alt="QR Code para conectar o WhatsApp"
              className="size-56"
            />
          </div>

          {estado.paircode && (
            <p className="text-sm text-muted">
              Prefere digitar? Use o código <b className="font-mono text-ink">{estado.paircode}</b> em
              Conectar com número de telefone.
            </p>
          )}

          {cansou ? (
            <Alert tone="warning">
              O código expirou. Toque em gerar outro para continuar.
            </Alert>
          ) : (
            <p className="text-sm text-muted">Esperando a leitura…</p>
          )}

          <Button onClick={pedir} disabled={pendente} variant="secondary" size="sm">
            <RefreshCw className="size-4" aria-hidden="true" />
            {pendente ? "Gerando…" : "Gerar outro código"}
          </Button>
        </>
      )}
    </div>
  );
}
