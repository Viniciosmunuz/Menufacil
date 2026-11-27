"use client";

import { ChevronDown, ChevronUp, ImagePlus, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import { useActionState, useEffect, useRef } from "react";

import { ImageField } from "@/components/panel/image-field";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";

import { PromptDaIa } from "./prompt-da-ia";
import {
  alternarBanner,
  alternarDestaque,
  apagarBanner,
  criarBanner,
  moverBanner,
  moverDestaque,
  type MenuFormState,
} from "../actions";

// A vitrine: o que o cliente vê antes de rolar o cardápio.
//
// Duas coisas na mesma tela porque respondem à mesma pergunta. Os
// banners são a faixa de cima, onde antes havia uma foto parada; os
// destaques são a prateleira logo abaixo. Separadas em duas telas, o
// dono teria de adivinhar em qual delas mexe o que ele está vendo no
// celular do cliente.

export type BannerDoPainel = {
  id: string;
  imageUrl: string;
  titulo: string | null;
  ativo: boolean;
};

export type DestaqueDoPainel = {
  id: string;
  name: string;
  imageUrl: string | null;
  priceCents: number;
  promoPriceCents: number | null;
  available: boolean;
  categoria: string;
};

/** as duas setas de ordem, do mesmo jeito do resto do cardápio */
function Setas({
  acao,
  restaurantId,
  id,
  primeiro,
  ultimo,
  oque,
}: {
  acao: (formData: FormData) => void;
  restaurantId: string;
  id: string;
  primeiro: boolean;
  ultimo: boolean;
  oque: string;
}) {
  const seta = (direction: "up" | "down", desligada: boolean, Icone: typeof ChevronUp, rotulo: string) => (
    <form action={acao}>
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="direction" value={direction} />
      <button
        type="submit"
        disabled={desligada}
        aria-label={`${rotulo} ${oque}`}
        className="grid size-7 place-items-center rounded-control text-faint transition-colors hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-25"
      >
        <Icone className="size-4" aria-hidden="true" />
      </button>
    </form>
  );

  return (
    <div className="flex shrink-0 flex-col">
      {seta("up", primeiro, ChevronUp, "Subir")}
      {seta("down", ultimo, ChevronDown, "Descer")}
    </div>
  );
}

function Banners({ restaurantId, banners }: { restaurantId: string; banners: BannerDoPainel[] }) {
  const [state, action] = useActionState<MenuFormState, FormData>(criarBanner, {});
  const form = useRef<HTMLFormElement>(null);

  // Subiu: o formulário se limpa, pronto para o próximo banner.
  //
  // O efeito depende do estado inteiro, e não do `ok`: o `ok` continua
  // verdadeiro depois do primeiro banner, e aí o segundo deixaria a foto
  // antiga na prévia. Cada envio devolve um objeto novo, e é isso que
  // faz a limpeza acontecer uma vez por envio.
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-extrabold">Banners da capa</h2>
        <p className="mt-0.5 text-sm text-muted">
          Passam sozinhos, e o cliente pode passar com o dedo. Sem nenhum ligado, a capa volta a ser a foto do restaurante.
        </p>
      </div>

      {state.error && <Alert tone="danger">{state.error}</Alert>}

      {banners.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-4 py-6 text-center text-sm text-faint">
          Nenhum banner ainda.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {banners.map((b, i) => (
            <li
              key={b.id}
              className={cn(
                "flex items-center gap-3 rounded-card border border-line bg-surface p-2",
                !b.ativo && "opacity-55",
              )}
            >
              <Setas
                acao={moverBanner}
                restaurantId={restaurantId}
                id={b.id}
                primeiro={i === 0}
                ultimo={i === banners.length - 1}
                oque="o banner"
              />

              {/* A faixa do cliente é deitada e baixa; a miniatura tem a
                  mesma proporção para o dono ver o corte que vai sair, e
                  não uma versão quadrada que mente sobre o enquadramento. */}
              <span className="relative aspect-[16/6] w-28 shrink-0 overflow-hidden rounded-control bg-surface-2 sm:w-40">
                <Image src={b.imageUrl} alt={b.titulo ?? ""} fill sizes="160px" className="object-cover" />
              </span>

              <span className="min-w-0 flex-1 truncate text-sm font-bold">
                {b.titulo || <span className="font-normal text-faint">Sem nome</span>}
              </span>

              <form action={alternarBanner} className="shrink-0">
                <input type="hidden" name="restaurantId" value={restaurantId} />
                <input type="hidden" name="id" value={b.id} />
                <button
                  type="submit"
                  role="switch"
                  aria-checked={b.ativo}
                  aria-label={b.ativo ? `Desligar o banner ${b.titulo ?? ""}` : `Ligar o banner ${b.titulo ?? ""}`}
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    b.ativo ? "bg-success" : "bg-line-strong",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 size-5 rounded-full bg-white transition-all",
                      b.ativo ? "left-[1.375rem]" : "left-0.5",
                    )}
                  />
                </button>
              </form>

              <form action={apagarBanner} className="shrink-0">
                <input type="hidden" name="restaurantId" value={restaurantId} />
                <input type="hidden" name="id" value={b.id} />
                <button
                  type="submit"
                  aria-label={`Apagar o banner ${b.titulo ?? ""}`}
                  className="grid size-9 place-items-center rounded-control border border-line text-faint transition-colors hover:border-danger hover:text-danger"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form ref={form} action={action} className="flex flex-col gap-3 rounded-card border border-line bg-surface-2 p-3">
        <input type="hidden" name="restaurantId" value={restaurantId} />
        {/* A prévia sai menor que o padrão: aqui se adiciona banner
            atrás de banner, e uma moldura vazia do tamanho de meia tela
            entre a lista e o botão faz cada novo banner custar uma
            rolagem. Sem dica embaixo: o corte da prévia já mostra o
            formato que vai sair. */}
        <div className="max-w-[18rem]">
          <ImageField name="image" label="Imagem do banner" currentUrl={null} shape="wide" />
        </div>
        <Input name="titulo" placeholder="Nome do banner (só você vê)" maxLength={60} className="max-w-sm" />
        <SubmitButton size="sm" className="self-start" pendingText="Subindo...">
          <ImagePlus className="size-4" aria-hidden="true" />
          Adicionar banner
        </SubmitButton>
      </form>

      {/* Fora do formulário de propósito: é o passo de antes. Quem não
          tem a imagem ainda copia o pedido daqui, faz na IA e volta. */}
      <PromptDaIa />
    </section>
  );
}

function Destaques({ restaurantId, destaques }: { restaurantId: string; destaques: DestaqueDoPainel[] }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-extrabold">Pratos em destaque</h2>
        <p className="mt-0.5 text-sm text-muted">
          A prateleira que aparece antes das categorias, na ordem desta lista.
        </p>
      </div>

      {destaques.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-4 py-6 text-center text-sm text-faint">
          Nenhum prato em destaque. Marque a estrela na edição do produto.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {destaques.map((p, i) => (
            <li
              key={p.id}
              className={cn(
                "flex items-center gap-3 rounded-card border border-line bg-surface p-2",
                !p.available && "opacity-55",
              )}
            >
              <Setas
                acao={moverDestaque}
                restaurantId={restaurantId}
                id={p.id}
                primeiro={i === 0}
                ultimo={i === destaques.length - 1}
                oque="o destaque"
              />

              <span className="relative size-12 shrink-0 overflow-hidden rounded-control bg-surface-2">
                {p.imageUrl ? (
                  <Image src={p.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                ) : (
                  <span className="grid size-full place-items-center text-faint">
                    <Star className="size-4" aria-hidden="true" />
                  </span>
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{p.name}</span>
                <span className="block truncate text-xs text-faint">
                  {p.categoria} · {formatCents(p.promoPriceCents ?? p.priceCents)}
                  {!p.available && " · esgotado"}
                </span>
              </span>

              <form action={alternarDestaque} className="shrink-0">
                <input type="hidden" name="restaurantId" value={restaurantId} />
                <input type="hidden" name="id" value={p.id} />
                <button
                  type="submit"
                  aria-label={`Tirar ${p.name} dos destaques`}
                  title="Tirar dos destaques"
                  className="grid size-9 place-items-center rounded-control border border-line text-brand transition-colors hover:border-brand"
                >
                  <Star className="size-4 fill-current" aria-hidden="true" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Vitrine({
  restaurantId,
  banners,
  destaques,
}: {
  restaurantId: string;
  banners: BannerDoPainel[];
  destaques: DestaqueDoPainel[];
}) {
  return (
    <div className="flex flex-col gap-8">
      <Banners restaurantId={restaurantId} banners={banners} />
      <Destaques restaurantId={restaurantId} destaques={destaques} />
    </div>
  );
}
