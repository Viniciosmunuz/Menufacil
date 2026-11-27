"use client";

import { ChevronDown, ChevronUp, Flame, ImagePlus, Pin, PinOff, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";

import { ImageField } from "@/components/panel/image-field";
import { BannerEnquadrado, FAIXA_DO_DESTAQUE } from "@/components/site/destaques-passando";
import { Alert } from "@/components/ui/alert";
import { Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { SwitchButton } from "@/components/ui/switch-button";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";

import { EditorDoBanner } from "./enquadrar";
import {
  alternarBanner,
  alternarDestaque,
  apagarBanner,
  criarBanner,
  ligarDestaques,
  moverBanner,
  moverDestaque,
  type MenuFormState,
} from "../actions";

// O que o cliente vê antes das categorias, numa tela só.
//
// Duas seções, na ordem em que aparecem no cardápio. Os Destaques são os
// banners que passam sozinhos, e o dono liga e desliga a seção inteira.
// Os Mais pedidos são escolhidos pelo sistema, pelas vendas do mês; aqui
// o dono só fixa o que quiser sempre ali e arruma a ordem dos fixados.

export type BannerDoPainel = {
  id: string;
  imageUrl: string;
  titulo: string | null;
  ativo: boolean;
  escala: number;
  focoX: number;
  focoY: number;
  largura: number | null;
  altura: number | null;
};

export type PratoDoPainel = {
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

/** a foto pequena e o nome de um prato, numa linha das listas */
function LinhaDoPrato({ p, detalhe }: { p: PratoDoPainel; detalhe?: string }) {
  return (
    <>
      <span className="relative size-11 shrink-0 overflow-hidden rounded-control bg-surface-2">
        {p.imageUrl ? (
          <Image src={p.imageUrl} alt="" fill sizes="44px" className="object-cover" />
        ) : (
          <span className="grid size-full place-items-center text-faint">
            <Star className="size-4" aria-hidden="true" />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{p.name}</span>
        {/* o detalhe (quanto vendeu) vem antes: é o motivo de o prato
            estar ali, e numa linha cortada ele é o que não pode sumir */}
        <span className="block truncate text-xs text-faint">
          {detalhe ? `${detalhe} · ${p.categoria}` : `${p.categoria} · ${formatCents(p.promoPriceCents ?? p.priceCents)}`}
          {!p.available && " · esgotado, não aparece"}
        </span>
      </span>
    </>
  );
}

function Destaques({
  restaurantId,
  ligados,
  banners,
}: {
  restaurantId: string;
  ligados: boolean;
  banners: BannerDoPainel[];
}) {
  const [state, action] = useActionState<MenuFormState, FormData>(criarBanner, {});
  const form = useRef<HTMLFormElement>(null);

  // Qual banner o editor está mostrando.
  //
  // Começa no primeiro ligado, que é o que o cliente vê ao abrir o
  // link. Tocar numa linha troca -- é assim que o dono confere e ajeita
  // um por um sem publicar nada.
  const [vendo, setVendo] = useState<string | null>(null);
  const ligadosNaLista = banners.filter((b) => b.ativo);
  const escolhido = banners.find((b) => b.id === vendo) ?? ligadosNaLista[0] ?? banners[0] ?? null;

  // Subiu: o formulário se limpa, pronto para o próximo banner.
  //
  // O efeito depende do estado inteiro, e não do `ok`: o `ok` continua
  // verdadeiro depois do primeiro banner, e aí o segundo deixaria a foto
  // antiga no campo. Cada envio devolve um objeto novo.
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 font-extrabold">
            <Star className="size-4 fill-brand text-brand" aria-hidden="true" />
            Destaques
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Imagens que passam sozinhas logo abaixo das abas do cardápio. O cliente também pode passar com o dedo.
          </p>
        </div>
        <form action={ligarDestaques} className="shrink-0">
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <SwitchButton checked={ligados} label={ligados ? "Ligado" : "Desligado"} />
        </form>
      </div>

      {!ligados ? (
        <p className="rounded-card border border-dashed border-line px-4 py-5 text-sm text-faint">
          Desligado: o cardápio começa pelos mais pedidos. Ligue para adicionar imagens.
          {banners.length > 0 &&
            ` ${banners.length === 1 ? "O banner que você já tem fica guardado" : `Os ${banners.length} banners que você já tem ficam guardados`} e volta quando ligar.`}
        </p>
      ) : (
        <>
          {state.error && <Alert tone="danger">{state.error}</Alert>}

          {/* O editor primeiro, porque é o resultado. A lista abaixo é o
              que escolhe qual banner ele mostra. A `key` faz o editor
              nascer de novo ao trocar de banner: sem ela, o ajuste do
              anterior apareceria no primeiro quadro do seguinte. */}
          {escolhido ? (
            <EditorDoBanner key={escolhido.id} restaurantId={restaurantId} banner={escolhido} />
          ) : (
            <p className="rounded-card border border-dashed border-line px-4 py-6 text-center text-sm text-faint">
              Nenhuma imagem ainda. Adicione a primeira aqui embaixo.
            </p>
          )}

          {banners.length > 0 && (
            <ul className="flex flex-col gap-2">
              {banners.map((b, i) => (
                <li
                  key={b.id}
                  className={cn(
                    "flex items-center gap-2 rounded-card border border-line bg-surface p-2",
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

                  {/* A miniatura é a faixa de verdade, com o enquadramento
                      salvo -- não uma versão quadrada que mente sobre o
                      corte. Tocar nela leva o banner para o editor. */}
                  <button
                    type="button"
                    onClick={() => setVendo(b.id)}
                    aria-pressed={escolhido?.id === b.id}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span
                      className={cn(
                        "relative w-20 shrink-0 overflow-hidden rounded-control bg-surface-2 ring-offset-2 ring-offset-surface sm:w-36",
                        FAIXA_DO_DESTAQUE,
                        escolhido?.id === b.id && "ring-2 ring-brand",
                      )}
                    >
                      <BannerEnquadrado banner={b} sizes="144px" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">
                      {b.titulo || <span className="font-normal text-faint">Sem nome</span>}
                    </span>
                  </button>

                  <form action={alternarBanner} className="shrink-0">
                    <input type="hidden" name="restaurantId" value={restaurantId} />
                    <input type="hidden" name="id" value={b.id} />
                    <button
                      type="submit"
                      role="switch"
                      aria-checked={b.ativo}
                      aria-label={b.ativo ? `Desligar o banner ${b.titulo ?? ""}` : `Ligar o banner ${b.titulo ?? ""}`}
                      className={cn("relative h-6 w-11 rounded-full transition-colors", b.ativo ? "bg-success" : "bg-line-strong")}
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
                      className="grid size-8 place-items-center rounded-control border border-line text-faint transition-colors hover:border-danger hover:text-danger"
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
            {/* A imagem sobe inteira, do jeito que veio: o corte quem
                escolhe é o dono, no editor de cima, olhando. */}
            {/* O tamanho exato, escrito.

                A faixa é 10 por 3, e 1600 x 480 é ela em pixel. Outra
                proporção não quebra nada -- a imagem entra inteira e o
                que sobra vira fundo desfocado -- mas nesta medida ela
                preenche de ponta a ponta, sem borda nenhuma. Ele pediu
                o número porque é o que a IA de imagem precisa ouvir. */}
            <div className="max-w-[18rem]">
              <ImageField
                name="image"
                label="Nova imagem"
                currentUrl={null}
                shape="wide"
                hint="1600 x 480 pixels (10:3) preenche a faixa inteira."
              />
            </div>
            <Input name="titulo" placeholder="Nome da imagem (só você vê)" maxLength={60} className="max-w-sm" />
            <SubmitButton size="sm" className="self-start" pendingText="Subindo...">
              <ImagePlus className="size-4" aria-hidden="true" />
              Adicionar imagem
            </SubmitButton>
          </form>
        </>
      )}
    </section>
  );
}

function MaisPedidos({
  restaurantId,
  fixados,
  automaticos,
  paraFixar,
}: {
  restaurantId: string;
  fixados: PratoDoPainel[];
  automaticos: (PratoDoPainel & { vendidos: number })[];
  paraFixar: { id: string; name: string; categoria: string }[];
}) {
  // a lista de fixar agrupada pela seção do cardápio, como o dono pensa nela
  const grupos = paraFixar.reduce<Map<string, { id: string; name: string }[]>>((mapa, p) => {
    mapa.set(p.categoria, [...(mapa.get(p.categoria) ?? []), p]);
    return mapa;
  }, new Map());

  const fixarForm = (id: string, rotulo: string) => (
    <form action={alternarDestaque} className="shrink-0">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="fixar" value="1" />
      <button
        type="submit"
        aria-label={`Fixar ${rotulo} em Mais pedidos`}
        className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line px-2.5 text-xs font-bold text-muted transition-colors hover:border-brand hover:text-brand"
      >
        <Pin className="size-3.5" aria-hidden="true" />
        Fixar
      </button>
    </form>
  );

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="flex items-center gap-1.5 font-extrabold">
          <Flame className="size-4 fill-brand/25 text-brand" aria-hidden="true" />
          Mais pedidos
        </h2>
        <p className="mt-0.5 text-sm text-muted">
          O sistema mostra sozinho os pratos que mais venderam nos últimos 30 dias. Fixe um prato para ele aparecer sempre,
          antes dos outros, na ordem que você escolher.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-extrabold tracking-wide text-faint uppercase">Fixados por você</h3>
        {fixados.length === 0 ? (
          <p className="rounded-card border border-dashed border-line px-4 py-4 text-center text-sm text-faint">
            Nenhum prato fixado.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {fixados.map((p, i) => (
              <li
                key={p.id}
                className={cn("flex items-center gap-2 rounded-card border border-line bg-surface p-2", !p.available && "opacity-55")}
              >
                <Setas
                  acao={moverDestaque}
                  restaurantId={restaurantId}
                  id={p.id}
                  primeiro={i === 0}
                  ultimo={i === fixados.length - 1}
                  oque="o prato"
                />
                <LinhaDoPrato p={p} />
                <form action={alternarDestaque} className="shrink-0">
                  <input type="hidden" name="restaurantId" value={restaurantId} />
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="fixar" value="0" />
                  <button
                    type="submit"
                    aria-label={`Soltar ${p.name} de Mais pedidos`}
                    title="Soltar"
                    className="grid size-8 place-items-center rounded-control border border-line text-brand transition-colors hover:border-brand"
                  >
                    <PinOff className="size-4" aria-hidden="true" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        {/* Fixar qualquer prato do cardápio, sem sair daqui. */}
        {paraFixar.length > 0 && (
          <form action={alternarDestaque} className="flex gap-2">
            <input type="hidden" name="restaurantId" value={restaurantId} />
            <input type="hidden" name="fixar" value="1" />
            <Select name="id" required defaultValue="" aria-label="Prato para fixar" className="min-w-0 flex-1">
              <option value="" disabled>
                Escolha um prato
              </option>
              {[...grupos].map(([categoria, pratos]) => (
                <optgroup key={categoria} label={categoria}>
                  {pratos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
            <SubmitButton variant="secondary" pendingText="Fixando..." className="h-12">
              <Pin className="size-4" aria-hidden="true" />
              Fixar
            </SubmitButton>
          </form>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-extrabold tracking-wide text-faint uppercase">Entram sozinhos agora</h3>
        {automaticos.length === 0 ? (
          <p className="rounded-card border border-dashed border-line px-4 py-4 text-center text-sm text-faint">
            {fixados.length > 0
              ? "Nenhum outro prato com vendas suficientes no mês. Até lá, aparecem só os fixados."
              : "Ainda não há vendas suficientes no mês. Até lá, a seção só aparece com algum prato fixado."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {automaticos.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-card border border-line bg-surface p-2 pl-3">
                <LinhaDoPrato p={p} detalhe={`${p.vendidos} vendidos no mês`} />
                {fixarForm(p.id, p.name)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function Vitrine({
  restaurantId,
  destaquesLigados,
  banners,
  fixados,
  automaticos,
  paraFixar,
}: {
  restaurantId: string;
  destaquesLigados: boolean;
  banners: BannerDoPainel[];
  fixados: PratoDoPainel[];
  automaticos: (PratoDoPainel & { vendidos: number })[];
  paraFixar: { id: string; name: string; categoria: string }[];
}) {
  return (
    // Em cartões, e não soltas uma embaixo da outra: são dois assuntos e,
    // sem moldura, a lista de banners encostava no título da outra seção
    // e parecia uma coisa só.
    <div className="flex flex-col gap-5">
      <div className="rounded-card border border-line bg-surface p-4">
        <Destaques restaurantId={restaurantId} ligados={destaquesLigados} banners={banners} />
      </div>
      <div className="rounded-card border border-line bg-surface p-4">
        <MaisPedidos restaurantId={restaurantId} fixados={fixados} automaticos={automaticos} paraFixar={paraFixar} />
      </div>
    </div>
  );
}
