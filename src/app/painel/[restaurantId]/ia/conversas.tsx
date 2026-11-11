"use client";

import { ArrowLeft, Ban, FlaskConical, Loader2, MessageSquare, User } from "lucide-react";
import { useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Gaveta } from "@/components/ui/gaveta";
import { cn } from "@/lib/cn";
import { formatPhone, normalizePhone } from "@/lib/format";
import type { Fala, ResumoDeConversa } from "@/server/ia/conversas";

import { marcarNaLista, verConversa } from "./actions";

// As conversas da IA, do lado do dono.
//
// Duas coisas num lugar só, e de propósito: ele lê o que ela respondeu e,
// na mesma linha, decide se aquele número volta a ser respondido. Antes
// isso eram dois lugares -- o WhatsApp no celular para ler, o painel para
// digitar o número -- e no meio do caminho ele desistia.
//
// As conversas do chat do cardápio entram junto, com etiqueta. Lá não há
// telefone (o contato é a sessão do navegador), então elas aparecem para
// ler e não têm os botões das listas: não há número para pôr neles.

/** o nome de quem falou, na bolha */
const QUEM: Record<Fala["papel"], string> = {
  CLIENTE: "Cliente",
  IA: "Lia",
  HUMANO: "Você",
};

/**
 * O recado interno de que a IA chamou uma pessoa.
 *
 * Fica gravado como HUMANO porque é isso que a faz ficar quieta, mas não
 * é fala de ninguém -- e numa bolha de conversa pareceria que o dono
 * escreveu isso para o cliente.
 */
const MARCA_CHAMOU = "[a IA chamou alguém do restaurante]";

const quando = (d: Date) => {
  const data = new Date(d);
  const hoje = new Date();
  const mesmoDia = data.toDateString() === hoje.toDateString();
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (mesmoDia) return `hoje, ${hora}`;
  const ontem = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);
  if (data.toDateString() === ontem.toDateString()) return `ontem, ${hora}`;
  return `${data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}, ${hora}`;
};

/** o nome da conversa: o telefone bonito, ou que veio do cardápio */
const nomeDe = (c: ResumoDeConversa) =>
  c.noCardapio ? "Pelo cardápio" : formatPhone(c.telefone);

const BOTAO =
  "flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-50";
const BOTAO_PARADO = "border-line bg-surface text-muted hover:border-line-strong";

function Linha({
  conversa,
  marcado,
  teste,
  abrir,
  marcar,
  mexendo,
}: {
  conversa: ResumoDeConversa;
  marcado: boolean;
  teste: boolean;
  abrir: () => void;
  marcar: (lista: "ignorado" | "teste") => void;
  mexendo: boolean;
}) {
  return (
    <li className="flex gap-3 border-b border-line py-3 last:border-0">
      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-faint">
        <User className="size-4" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-extrabold">{nomeDe(conversa)}</p>
          {conversa.noCardapio && (
            <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[0.65rem] font-extrabold text-muted">
              cardápio
            </span>
          )}
          {marcado && (
            <span className="shrink-0 rounded-full bg-danger-soft px-2 py-0.5 text-[0.65rem] font-extrabold text-danger-ink">
              não responde
            </span>
          )}
          {teste && (
            <span className="shrink-0 rounded-full bg-success-soft px-2 py-0.5 text-[0.65rem] font-extrabold text-success-ink">
              teste
            </span>
          )}
          <span className="ml-auto shrink-0 text-xs text-faint">{quando(conversa.quando)}</span>
        </div>

        <p className="mt-0.5 truncate text-sm text-muted">
          {conversa.ultima === MARCA_CHAMOU ? "Ela passou a conversa para você" : conversa.ultima}
        </p>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <button type="button" onClick={abrir} className={cn(BOTAO, BOTAO_PARADO)}>
            <MessageSquare className="size-3.5" aria-hidden="true" />
            Ver conversa ({conversa.total})
          </button>

          {/* sem telefone não há o que pôr nas listas */}
          {!conversa.noCardapio && (
            <>
              <button
                type="button"
                disabled={mexendo}
                onClick={() => marcar("ignorado")}
                className={cn(
                  BOTAO,
                  marcado
                    ? "border-danger-line bg-danger-soft text-danger-ink"
                    : BOTAO_PARADO,
                )}
              >
                <Ban className="size-3.5" aria-hidden="true" />
                Não responder
              </button>
              <button
                type="button"
                disabled={mexendo}
                onClick={() => marcar("teste")}
                className={cn(
                  BOTAO,
                  teste ? "border-success-line bg-success-soft text-success-ink" : BOTAO_PARADO,
                )}
              >
                <FlaskConical className="size-3.5" aria-hidden="true" />
                É teste
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

/** o que foi dito, de cima para baixo */
function Fio({ falas, voltar }: { falas: Fala[]; voltar: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={voltar}
        className="mb-1 flex items-center gap-1.5 self-start text-sm font-extrabold text-brand"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Todas as conversas
      </button>

      {falas.map((f, i) => {
        if (f.texto === MARCA_CHAMOU)
          return (
            <p key={f.id} className="self-center text-xs font-bold text-faint">
              — ela passou a conversa para você —
            </p>
          );
        const daCasa = f.papel !== "CLIENTE";
        // o nome só quando muda de lado: numa sequência do mesmo, repetir
        // o rótulo em toda bolha só faz barulho
        const mostraQuem = i === 0 || falas[i - 1]?.papel !== f.papel;
        return (
          <div key={f.id} className={cn("flex flex-col gap-1", daCasa ? "items-end" : "items-start")}>
            {mostraQuem && <span className="text-[0.65rem] font-extrabold text-faint">{QUEM[f.papel]}</span>}
            <p
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                daCasa
                  ? "rounded-br-sm bg-brand-soft text-ink"
                  : "rounded-bl-sm bg-surface-2 text-ink",
              )}
            >
              {f.texto}
            </p>
            <span className="text-[0.65rem] text-faint">{quando(f.quando)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ConversasDaIa({
  restaurantId,
  conversas,
  ignorados,
  semEspera,
}: {
  restaurantId: string;
  conversas: ResumoDeConversa[];
  ignorados: string[];
  semEspera: string[];
}) {
  const [listas, setListas] = useState({ ignorados, semEspera });
  const [aberta, setAberta] = useState<ResumoDeConversa | null>(null);
  const [falas, setFalas] = useState<Fala[]>([]);
  const [recado, setRecado] = useState<{ erro?: string; ok?: string }>({});
  const [carregando, abrindo] = useTransition();
  const [mexendo, marcando] = useTransition();

  /** o número está nesta lista? comparado em dígitos, como o servidor grava */
  const estaEm = (lista: string[], telefone: string) =>
    telefone ? lista.includes(normalizePhone(telefone)) : false;

  function abrir(conversa: ResumoDeConversa) {
    setRecado({});
    abrindo(async () => {
      const r = await verConversa(restaurantId, conversa.contato);
      if (r.error) return setRecado({ erro: r.error });
      setFalas(r.falas);
      setAberta(conversa);
    });
  }

  function marcar(conversa: ResumoDeConversa, lista: "ignorado" | "teste") {
    marcando(async () => {
      const r = await marcarNaLista(restaurantId, conversa.telefone, lista);
      if (r.error) return setRecado({ erro: r.error });
      // o servidor devolve as duas listas salvas, e a tela passa a mostrar
      // o que está gravado -- não o que eu supus que ficaria
      if (r.ignorados && r.semEspera)
        setListas({ ignorados: r.ignorados, semEspera: r.semEspera });
      setRecado({ ok: r.message });
    });
  }

  const resumo =
    conversas.length === 0
      ? "Ninguém falou com ela ainda"
      : `${conversas.length} ${conversas.length === 1 ? "conversa" : "conversas"} nos últimos 30 dias`;

  return (
    <Gaveta titulo="Conversas da IA" resumo={resumo} icone={<MessageSquare />}>
      {recado.erro && <Alert tone="danger">{recado.erro}</Alert>}
      {recado.ok && <Alert tone="success">{recado.ok}</Alert>}

      {conversas.length === 0 ? (
        <p className="text-sm text-muted">
          Aqui aparecem as conversas dela, no WhatsApp e no chat do cardápio, com o que foi dito dos
          dois lados.
        </p>
      ) : carregando ? (
        <p className="flex items-center gap-2 py-4 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Abrindo a conversa...
        </p>
      ) : aberta ? (
        <Fio falas={falas} voltar={() => setAberta(null)} />
      ) : (
        <>
          <ul className="flex flex-col">
            {conversas.map((c) => (
              <Linha
                key={c.contato}
                conversa={c}
                marcado={estaEm(listas.ignorados, c.telefone)}
                teste={estaEm(listas.semEspera, c.telefone)}
                abrir={() => abrir(c)}
                marcar={(lista) => marcar(c, lista)}
                mexendo={mexendo}
              />
            ))}
          </ul>
          <p className="text-xs text-faint">
            Marcar aqui é o mesmo que digitar o número nas listas acima. Tocar de novo tira da lista.
          </p>
        </>
      )}
    </Gaveta>
  );
}
