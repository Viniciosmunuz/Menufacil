"use client";

import { Send, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * O atendente do MenuFácil dentro do cardápio.
 *
 * Só aparece onde o dono ligou a chave -- quem decide isso é o servidor,
 * que só monta este componente quando a IA está ligada para aquele
 * restaurante.
 *
 * A bolha fica acima da barra de baixo e some quando o carrinho abre: no
 * celular, dois botões flutuantes disputando o polegar é o começo de um
 * toque errado.
 *
 * **O rosto é da atendente do MenuFácil**, e não um ícone de robô. Quem
 * chega ao cardápio pelo link não está procurando um recurso de software:
 * uma cara sorrindo num canto convida a perguntar, um robozinho avisa que
 * do outro lado não tem ninguém. O botão é só o círculo, sem rótulo --
 * foto redonda no canto é o gesto que todo mundo já conhece de outros
 * sites, e a legenda só roubava espaço do cardápio.
 */

/** o avatar da atendente, o mesmo no botão e no cabeçalho da conversa */
const ROSTO = "/atendente-ia.webp";

type Fala = { de: "cliente" | "ia"; texto: string };

/** O rótulo da conversa, só para a IA lembrar do que já foi dito nesta aba.
 *  Fica no navegador e não identifica ninguém. */
function sessaoDoNavegador() {
  const chave = "mf_ia_sessao";
  try {
    const guardada = localStorage.getItem(chave);
    if (guardada) return guardada;
    const nova = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(chave, nova);
    return nova;
  } catch {
    // aba anônima ou armazenamento bloqueado: a conversa vale só por esta visita
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

export function ChatIa({ slug, nome }: { slug: string; nome: string }) {
  const [aberto, setAberto] = useState(false);
  const [falas, setFalas] = useState<Fala[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (aberto) {
      fim.current?.scrollIntoView({ block: "end" });
      campo.current?.focus();
    }
  }, [aberto, falas, pensando]);

  async function mandar(e: React.FormEvent) {
    e.preventDefault();
    const pergunta = texto.trim();
    if (!pergunta || pensando) return;

    setFalas((f) => [...f, { de: "cliente", texto: pergunta }]);
    setTexto("");
    setPensando(true);

    try {
      const r = await fetch("/api/ia/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, sessao: sessaoDoNavegador(), texto: pergunta }),
      });
      const dados = await r.json();
      const resposta: string =
        dados.texto || "Não consegui responder agora. Tente de novo em instantes.";
      const anexos: string[] = Array.isArray(dados.anexos) ? dados.anexos : [];
      setFalas((f) => [
        ...f,
        { de: "ia", texto: resposta },
        ...anexos.map((a) => ({ de: "ia" as const, texto: a })),
      ]);
    } catch {
      setFalas((f) => [
        ...f,
        { de: "ia", texto: "Não consegui responder agora. Tente de novo em instantes." },
      ]);
    } finally {
      setPensando(false);
    }
  }

  return (
    <>
      {/* a bolha; some enquanto a janela está aberta */}
      {!aberto && (
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-label={`Falar com a assistente virtual de ${nome}`}
          className="fixed right-4 bottom-20 z-40 flex flex-col items-end gap-1 transition-transform active:scale-95 lg:bottom-6"
        >
          <span className="relative size-12">
            <span className="block size-full overflow-hidden rounded-full bg-brand-soft shadow-lg shadow-ink/20">
              <Image
                src={ROSTO}
                alt=""
                width={96}
                height={96}
                // o rosto cabe no círculo sem esticar, em qualquer densidade de tela
                className="size-full object-cover"
              />
            </span>
            {/* a bolinha de "está aí agora", a mesma do WhatsApp e do
                Messenger. O anel da cor do fundo é o que a separa do
                cabelo escuro -- sem ele vira uma mancha. */}
            <span className="absolute -top-0.5 -right-0.5 size-3.5 rounded-full bg-success ring-2 ring-bg" />
          </span>
          {/* Sem isto a foto passa por uma pessoa de verdade esperando do
              outro lado, e quem escreve espera resposta de gente. A etiqueta
              é o que separa uma assistente simpática de uma pegadinha. */}
          <span className="rounded-full border border-line bg-bg px-2 py-0.5 text-[10px] leading-4 font-bold text-muted shadow-sm">
            Assistente virtual · <span className="text-success">online</span>
          </span>
        </button>
      )}

      {aberto && (
        <div
          role="dialog"
          aria-label="Atendente"
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[82dvh] flex-col rounded-t-card border border-line bg-bg shadow-2xl lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-96 lg:rounded-card"
        >
          <header className="flex items-center gap-3 border-b border-line px-4 py-3">
            <span className="relative size-10 shrink-0">
              <span className="block size-full overflow-hidden rounded-full bg-brand-soft">
                <Image src={ROSTO} alt="" width={80} height={80} className="size-full object-cover" />
              </span>
              <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-success ring-2 ring-bg" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">Assistente virtual</span>
              <span className="block truncate text-xs text-muted">{nome}</span>
            </span>
            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Fechar"
              className="grid size-10 shrink-0 place-items-center rounded-control text-muted hover:text-ink"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </header>

          <div className="flex min-h-40 flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
            {falas.length === 0 && (
              <p className="text-sm text-muted">
                Pergunte sobre o cardápio, o tempo de entrega ou as formas de
                pagamento. Para fazer o pedido, use o cardápio aqui do lado.
              </p>
            )}
            {falas.map((f, i) => (
              <p
                key={i}
                className={cn(
                  "max-w-[85%] rounded-card px-4 py-2.5 text-sm whitespace-pre-wrap",
                  f.de === "cliente"
                    ? "self-end bg-brand text-brand-ink"
                    : "self-start bg-surface text-ink",
                )}
              >
                {f.texto}
              </p>
            ))}
            {pensando && (
              <p className="self-start rounded-card bg-surface px-4 py-2.5 text-sm text-muted">
                escrevendo…
              </p>
            )}
            <div ref={fim} />
          </div>

          <form onSubmit={mandar} className="flex items-center gap-2 border-t border-line p-3">
            <input
              ref={campo}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={1200}
              placeholder="Escreva sua dúvida"
              className="h-12 min-w-0 flex-1 rounded-control border border-line bg-surface px-4 text-base outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={!texto.trim() || pensando}
              aria-label="Enviar"
              className="grid size-12 shrink-0 place-items-center rounded-control bg-brand text-brand-ink disabled:opacity-40"
            >
              <Send className="size-5" aria-hidden="true" />
            </button>
          </form>

          <p className="px-4 pb-3 text-center text-[11px] text-faint">
            Atendimento automático do MenuFácil
          </p>
        </div>
      )}
    </>
  );
}
