"use client";

import { Bot, Check, Copy } from "lucide-react";
import { useActionState, useState } from "react";

import { SectionTitle } from "@/components/panel/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";

import type { AdminFormState } from "../actions";
import {
  conferirConexaoDaIa,
  gerarLinkDaIa,
  salvarCanalZapi,
  salvarContaUazapi,
} from "./ia-actions";

export type EstadoDaIa = {
  ativo: boolean;
  fazPedidos: boolean;
  /// o atendente no chat do cardapio, com chave propria
  noChat: boolean;
  /// o canal da Z-API (WhatsApp Web), quando este restaurante usa esse caminho
  zapiChannelId: string | null;
  /// o servidor da instância na uazapi, quando é por ela que ele fala
  uazapiBaseUrl: string | null;
  /// o nome da instância no painel da uazapi, só para mostrar aqui
  uazapiInstancia: string | null;
  /// se a conta da uazapi está preenchida (o token nunca sai do servidor)
  temUazapi: boolean;
  linkDeConexao: string | null;
  numeroExibido: string | null;
  conectado: boolean;
  /// a chave da plataforma, em Recursos: sem ela o dono nem vê a seção
  liberada: boolean;
};

/**
 * A conexão do WhatsApp deste restaurante com a IA -- e só ela.
 *
 * O que a IA faz mora no painel do dono: ligar o atendimento, anotar
 * pedidos, responder no cardápio, as listas de números e apagar o que ela
 * lembra. São decisões do dia a dia dele, e ele é quem sabe se hoje quer
 * atender sozinho.
 *
 * Aqui fica o que o dono não tem como fazer: conectar o número, que passa
 * por uma conta da plataforma (a Kapso ou a Z-API), e a chave de liberar,
 * que está em Recursos, ao lado das outras.
 */
export function IaPanel({ restaurantId, estado }: { restaurantId: string; estado: EstadoDaIa | null }) {
  const [gerado, gerar] = useActionState<AdminFormState, FormData>(gerarLinkDaIa, {});
  const [conferido, conferir] = useActionState<AdminFormState, FormData>(conferirConexaoDaIa, {});
  const [canal, mudarCanal] = useActionState<AdminFormState, FormData>(salvarCanalZapi, {});
  const [uazapi, mudarUazapi] = useActionState<AdminFormState, FormData>(salvarContaUazapi, {});
  const [copiou, setCopiou] = useState(false);

  const ultimo = [uazapi, canal, conferido, gerado].find((s) => s.error || s.message);

  return (
    <Card>
      <SectionTitle description="Conectar o WhatsApp do restaurante à IA. O que ela faz — ligar o atendimento, anotar pedidos, responder no cardápio — fica no painel do dono.">
        <span className="flex items-center gap-2">
          <Bot className="size-5 text-brand" aria-hidden="true" />
          Menu Fácil IA
          {estado?.conectado ? <Badge tone="success">WhatsApp conectado</Badge> : <Badge>Sem WhatsApp</Badge>}
        </span>
      </SectionTitle>

      <div className="flex flex-col gap-4">
        {ultimo?.error && <Alert tone="danger">{ultimo.error}</Alert>}
        {ultimo?.message && !ultimo.error && <Alert tone="success">{ultimo.message}</Alert>}

        {/* Conectar não é liberar: sem a chave em Recursos o dono não vê a
            seção, e aí o número conectado não serve para nada. */}
        {!estado?.liberada && (
          <Alert tone="warning">
            O Menu Fácil IA está desligado em <b>Recursos</b>, acima. Ligue a chave para a seção aparecer no painel do
            dono.
          </Alert>
        )}

        {/* O caminho da uazapi (WhatsApp Web, por QR code).

            É o mais barato por número -- a Z-API cobra por canal, perto de
            R$ 100, e a uazapi cobra por servidor, até 100 números por
            R$ 138 --, e é onde devem nascer os restaurantes novos.

            Aqui o webhook é apontado pelo próprio sistema ao salvar,
            junto com os filtros que descartam mensagem de grupo antes de
            sair do servidor deles. Não há nada a configurar no painel da
            uazapi além de ler o QR code. */}
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-sm font-extrabold">
            WhatsApp pela uazapi
            {estado?.temUazapi ? <Badge tone="success">Ligado</Badge> : <Badge>Sem conta</Badge>}
          </p>
          <p className="text-sm text-muted">
            Crie a instância no painel da uazapi, leia o QR code com o celular do restaurante e cole aqui o
            endereço do servidor e o token da instância. O webhook é apontado por nós ao salvar.
          </p>
          <form action={mudarUazapi} className="flex flex-col gap-2">
            <input type="hidden" name="restaurantId" value={restaurantId} />
            <div className="flex flex-wrap items-center gap-2">
              <input
                name="baseUrl"
                defaultValue={estado?.uazapiBaseUrl ?? ""}
                placeholder="https://abc.uazapi.com"
                className="h-11 min-w-0 flex-1 rounded-control border border-line bg-surface px-3 font-mono text-sm outline-none focus:border-brand"
              />
              <input
                name="instancia"
                defaultValue={estado?.uazapiInstancia ?? ""}
                placeholder="nome da instância"
                className="h-11 min-w-0 flex-1 rounded-control border border-line bg-surface px-3 text-sm outline-none focus:border-brand"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* O token é segredo: nunca volta preenchido do servidor, e
                  por isso o campo nasce vazio mesmo com a conta ligada. */}
              <input
                name="token"
                type="password"
                autoComplete="off"
                placeholder={estado?.temUazapi ? "token salvo — cole de novo para trocar" : "token da instância"}
                className="h-11 min-w-0 flex-1 rounded-control border border-line bg-surface px-3 font-mono text-sm outline-none focus:border-brand"
              />
              <SubmitButton variant="secondary" size="sm">
                Salvar conta
              </SubmitButton>
            </div>
          </form>
        </div>

        <div className="border-t border-line pt-4" />
        {/* O caminho da Z-API (WhatsApp Web, por QR code). É o que funciona
            hoje: a Meta recusa o envio desta conta para números
            brasileiros. O canal é criado e pareado no painel da Z-API --
            aquela plataforma não deixa criar canal de QR code pela API --,
            e aqui só se cola o ID. */}
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-sm font-extrabold">
            WhatsApp pela Z-API
            {estado?.zapiChannelId ? <Badge tone="success">Ligado</Badge> : <Badge>Sem canal</Badge>}
          </p>
          <p className="text-sm text-muted">
            Crie o canal <b>WhatsApp Web</b> no painel da Z-API, leia o QR code com o celular do restaurante e cole
            aqui o ID do canal. Depois aponte o webhook dele para{" "}
            <code className="rounded bg-surface px-1">/api/zapi/webhook</code>.
          </p>
          <form action={mudarCanal} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="restaurantId" value={restaurantId} />
            <input
              name="canal"
              defaultValue={estado?.zapiChannelId ?? ""}
              placeholder="ID do canal na Z-API"
              className="h-11 min-w-0 flex-1 rounded-control border border-line bg-surface px-3 font-mono text-sm outline-none focus:border-brand"
            />
            <SubmitButton variant="secondary" size="sm">
              Salvar canal
            </SubmitButton>
          </form>
        </div>

        {/* O caminho da Kapso, pela conta de negócio da Meta. Fica porque
            existem números conectados por ele, mas a Meta recusa o envio
            desta conta para o Brasil (erro 130497). */}
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <p className="text-sm font-extrabold">WhatsApp pela Kapso (a Meta recusa o envio hoje)</p>
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
                {copiou ? (
                  <Check className="size-4 text-success" aria-hidden="true" />
                ) : (
                  <Copy className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted">
              O dono abre o link, entra com o Facebook e conecta o WhatsApp dele. Depois que ele terminar, confira aqui.
            </p>
          )}
          {estado?.numeroExibido && (
            <p className="text-sm text-muted">
              Conectado: <span className="font-bold text-ink">{estado.numeroExibido}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <form action={gerar}>
              <input type="hidden" name="restaurantId" value={restaurantId} />
              <SubmitButton variant="secondary" size="sm">
                {estado?.linkDeConexao ? "Gerar outro link" : "Gerar link de conexão"}
              </SubmitButton>
            </form>
            {estado?.linkDeConexao && (
              <form action={conferir}>
                <input type="hidden" name="restaurantId" value={restaurantId} />
                <SubmitButton variant="secondary" size="sm">
                  Conferir conexão
                </SubmitButton>
              </form>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
