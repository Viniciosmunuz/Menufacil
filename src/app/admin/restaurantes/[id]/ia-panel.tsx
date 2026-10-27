"use client";

import { Bot, Check, Copy } from "lucide-react";
import { useActionState, useState } from "react";

import { SectionTitle } from "@/components/panel/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";

import type { AdminFormState } from "../actions";
import { conferirConexaoDaIa, gerarLinkDaIa, ligarIa } from "./ia-actions";

export type EstadoDaIa = {
  ativo: boolean;
  linkDeConexao: string | null;
  numeroExibido: string | null;
  conectado: boolean;
};

/**
 * O Menu Fácil IA deste restaurante, em três passos: gerar o link, conferir
 * que o dono conectou, ligar. Cada passo só aparece quando o anterior está
 * feito, para não haver botão que não faz nada.
 */
export function IaPanel({ restaurantId, estado }: { restaurantId: string; estado: EstadoDaIa | null }) {
  const [gerado, gerar] = useActionState<AdminFormState, FormData>(gerarLinkDaIa, {});
  const [conferido, conferir] = useActionState<AdminFormState, FormData>(conferirConexaoDaIa, {});
  const [ligado, ligar] = useActionState<AdminFormState, FormData>(ligarIa, {});
  const [copiou, setCopiou] = useState(false);

  const ultimo = [ligado, conferido, gerado].find((s) => s.error || s.message);

  return (
    <Card>
      <SectionTitle description="Atendente no WhatsApp do restaurante. Responde dúvidas e manda o link do cardápio; não anota pedido.">
        <span className="flex items-center gap-2">
          <Bot className="size-5 text-brand" aria-hidden="true" />
          Menu Fácil IA
          {estado?.ativo ? (
            <Badge tone="success">Ligada</Badge>
          ) : estado?.conectado ? (
            <Badge>Conectada, desligada</Badge>
          ) : (
            <Badge>Teste</Badge>
          )}
        </span>
      </SectionTitle>

      <div className="flex flex-col gap-4">
        {ultimo?.error && <Alert tone="danger">{ultimo.error}</Alert>}
        {ultimo?.message && !ultimo.error && <Alert tone="success">{ultimo.message}</Alert>}

        {/* 1. o link para o dono conectar o WhatsApp */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-extrabold">1. Link de conexão</p>
          {estado?.linkDeConexao ? (
            <div className="flex items-center gap-2 rounded-control border border-line bg-surface-2 p-2">
              <code className="min-w-0 flex-1 truncate text-xs">{estado.linkDeConexao}</code>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(estado.linkDeConexao ?? "");
                  setCopiou(true);
                }}
                aria-label="Copiar o link"
                className="grid size-9 shrink-0 place-items-center rounded-control text-muted hover:bg-surface hover:text-ink"
              >
                {copiou ? <Check className="size-4 text-success" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted">
              O dono abre o link, entra com o Facebook e conecta o WhatsApp dele. Ele continua usando o app no celular normalmente.
            </p>
          )}
          <form action={gerar}>
            <input type="hidden" name="restaurantId" value={restaurantId} />
            <SubmitButton variant="secondary" size="sm">
              {estado?.linkDeConexao ? "Gerar outro link" : "Gerar link de conexão"}
            </SubmitButton>
          </form>
        </div>

        {/* 2. conferir que ele conectou */}
        {estado?.linkDeConexao && (
          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <p className="text-sm font-extrabold">2. Conexão</p>
            {estado.conectado ? (
              <p className="text-sm text-muted">
                Conectado: <span className="font-bold text-ink">{estado.numeroExibido ?? "número sem rótulo"}</span>
              </p>
            ) : (
              <p className="text-sm text-muted">Depois que o dono terminar pelo link, confira aqui.</p>
            )}
            <form action={conferir}>
              <input type="hidden" name="restaurantId" value={restaurantId} />
              <SubmitButton variant="secondary" size="sm">
                {estado.conectado ? "Conferir de novo" : "Conferir conexão"}
              </SubmitButton>
            </form>
          </div>
        )}

        {/* 3. ligar */}
        {estado?.conectado && (
          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <p className="text-sm font-extrabold">3. Atendimento</p>
            <p className="text-sm text-muted">
              {estado.ativo
                ? "A IA responde quem mandar mensagem. Se alguém do restaurante responder pelo celular, ela fica quieta por 30 minutos naquela conversa."
                : "Desligada: as mensagens chegam normalmente no WhatsApp do dono e a IA não responde nada."}
            </p>
            <form action={ligar}>
              <input type="hidden" name="restaurantId" value={restaurantId} />
              <input type="hidden" name="ligar" value={estado.ativo ? "0" : "1"} />
              <SubmitButton variant={estado.ativo ? "secondary" : "primary"} size="sm">
                {estado.ativo ? "Desligar a IA" : "Ligar a IA"}
              </SubmitButton>
            </form>
          </div>
        )}
      </div>
    </Card>
  );
}
