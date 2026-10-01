"use client";

import { CreditCard, QrCode, ShoppingBag, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { QuantityStepper } from "@/components/site/quantity-stepper";
import { cartSubtotal, clearCart, setQuantity, useCart, type CartRestaurant } from "@/components/site/cart-store";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";

import { ponte } from "../ponte";

// Fechar o pedido no totem.
//
// O cardápio é o mesmo do link; é aqui que o caminho se separa. Em vez de
// endereço, taxa e troco, o balcão pergunta duas coisas: come aqui ou
// leva, e paga no cartão ou no Pix. Dinheiro não existe no totem -- não há
// quem receba nem quem dê troco.
//
// Quem cobra não é esta página diretamente: ela pede pela ponte (ver
// ../ponte.ts), que sabe falar tanto pelo tablet no navegador quanto pelo
// aplicativo antigo do Windows. Num aparelho que ainda não foi ativado, a
// tela funciona inteira até o botão de confirmar -- é assim que dá para
// conferir o visual pelo celular sem cobrar nada de ninguém.

type Via = { numero?: number } | null;

/** de quanto em quanto tempo perguntamos como está o pagamento */
const PASSO_MS = 2000;
/** desiste de esperar depois disto */
const LIMITE_MS = 5 * 60 * 1000;

type Etapa = "escolhendo" | "cobrando" | "pronto";

export function TotemCheckout({
  restaurant,
  minOrderCents,
  aberto,
}: {
  restaurant: CartRestaurant;
  minOrderCents: number;
  aberto: boolean;
}) {
  const cart = useCart();
  const meu = cart.restaurant?.id === restaurant.id;
  const itens = meu ? cart.items : [];
  const subtotal = cartSubtotal(cart);
  const falta = Math.max(0, minOrderCents - subtotal);

  const [comerAqui, setComerAqui] = useState<boolean | null>(null);
  const [forma, setForma] = useState<"cartao" | "pix" | null>(null);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  // quando a cobrança para por falta de ativação, a tela oferece o caminho:
  // é o dono que está testando, e sem isto ele não descobre onde ativar
  const [precisaAtivar, setPrecisaAtivar] = useState(false);

  const [etapa, setEtapa] = useState<Etapa>("escolhendo");
  const [qr, setQr] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [numero, setNumero] = useState<number | null>(null);
  const pagamentoId = useRef<string | null>(null);
  const relogio = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(relogio.current), []);

  // função declarada (não const) de propósito: ela se chama de novo a cada
  // volta do relógio, e uma const não pode se referenciar antes de existir
  async function acompanhar(comecouEm: number) {
    const canal = ponte();
    const id = pagamentoId.current;
    if (!canal || !id) return;

    const resposta = (await canal.conferirPagamento(id)) as { situacao?: string; erro?: string; pedido?: Via };

    if (resposta.situacao === "aprovado") {
      pagamentoId.current = null;
      setNumero(resposta.pedido?.numero ?? null);
      setEtapa("pronto");
      clearCart();
      // No tablet quem imprime é o Menu Fácil Print, que pega o pedido na
      // fila do restaurante sozinho. No aplicativo do Windows, a via sai
      // ali mesmo. A ponte sabe qual dos dois é.
      if (resposta.pedido) await canal.imprimir(resposta.pedido);
      return;
    }
    if (resposta.situacao === "cancelado" || resposta.situacao === "recusado") {
      pagamentoId.current = null;
      setEtapa("escolhendo");
      setErro(resposta.situacao === "cancelado" ? "Pagamento cancelado." : "O pagamento não foi aprovado. Tente de novo.");
      return;
    }
    if (resposta.situacao === "pago_sem_pedido") {
      pagamentoId.current = null;
      setErro("O pagamento passou, mas o pedido não entrou. Chame um atendente.");
      return;
    }
    if (Date.now() - comecouEm > LIMITE_MS) {
      pagamentoId.current = null;
      setEtapa("escolhendo");
      setErro("Ninguém pagou a tempo. Comece de novo ou chame um atendente.");
      return;
    }
    relogio.current = setTimeout(() => acompanhar(comecouEm), PASSO_MS);
  }

  async function confirmar() {
    setErro(null);
    if (comerAqui === null) return setErro("Diga se vai comer aqui ou levar.");
    if (!forma) return setErro("Escolha como quer pagar.");

    const canal = ponte();
    if (!canal) {
      setErro("Este aparelho ainda não foi ativado como totem. Chame um atendente.");
      setPrecisaAtivar(true);
      return;
    }

    setEtapa("cobrando");
    const resposta = (await canal.cobrar({
      forma,
      comer_aqui: comerAqui,
      nome: nome.trim(),
      itens: itens.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        optionIds: i.optionIds ?? [],
        flavorIds: i.flavorIds ?? [],
        notes: i.notes || null,
      })),
    })) as { erro?: string; pagamento_id?: string; total_centavos?: number; pix?: { imagem_base64?: string | null } };

    if (resposta.erro || !resposta.pagamento_id) {
      setEtapa("escolhendo");
      setErro(resposta.erro ?? "Não consegui começar a cobrança.");
      return;
    }

    pagamentoId.current = resposta.pagamento_id;
    setTotal(resposta.total_centavos ?? subtotal);
    setQr(resposta.pix?.imagem_base64 ?? null);
    relogio.current = setTimeout(() => acompanhar(Date.now()), PASSO_MS);
  }

  async function desistir() {
    clearTimeout(relogio.current);
    const id = pagamentoId.current;
    const canal = ponte();
    const resposta = (id && canal ? await canal.cancelarPagamento(id) : { ok: true }) as { ok?: boolean; erro?: string };
    if (resposta?.erro) {
      // pagou enquanto o dedo ia no botão: volta a acompanhar
      setErro(resposta.erro);
      relogio.current = setTimeout(() => acompanhar(Date.now()), PASSO_MS);
      return;
    }
    pagamentoId.current = null;
    setEtapa("escolhendo");
  }

  // ---- pedido pronto ----------------------------------------------------

  if (etapa === "pronto") {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p className="text-xl text-muted">Pedido confirmado!</p>
          {numero !== null && <p className="mt-2 text-8xl font-extrabold text-brand tabular-nums">#{numero}</p>}
          <p className="mt-4 text-lg text-muted">
            Guarde a sua senha. {comerAqui ? "Chamamos você quando ficar pronto." : "Retire no balcão quando chamarmos."}
          </p>
          <Link href={`/totem/${restaurant.slug}`} className={buttonClasses("primary", "lg", "mt-8")}>
            Fazer outro pedido
          </Link>
        </div>
      </div>
    );
  }

  // ---- esperando o pagamento -------------------------------------------

  if (etapa === "cobrando") {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-extrabold">{forma === "pix" ? "Pague com Pix" : "Pague na maquininha"}</h1>
          <p className="mt-1 text-2xl text-muted tabular-nums">{formatCents(total)}</p>

          {forma === "pix" ? (
            qr ? (
              // eslint-disable-next-line @next/next/no-img-element -- imagem vem em base64 do Mercado Pago
              <img src={`data:image/png;base64,${qr}`} alt="QR Code do Pix" className="mt-5 w-56 rounded-card bg-white p-2" />
            ) : (
              <p className="mt-5 text-muted">Gerando o código...</p>
            )
          ) : (
            <div className="mt-6 size-16 animate-spin rounded-full border-4 border-line border-t-brand" aria-hidden="true" />
          )}

          <p className="mt-4 max-w-sm text-muted">
            {forma === "pix"
              ? "Abra o aplicativo do seu banco, escolha Pix e aponte a câmera para o código."
              : "Siga as instruções na maquininha ao lado da tela."}
          </p>
          {erro && (
            <Alert tone="danger" className="mt-4">
              {erro}
            </Alert>
          )}
          <Button variant="secondary" size="lg" className="mt-6" onClick={desistir}>
            Cancelar pedido
          </Button>
        </div>
      </div>
    );
  }

  // ---- escolhendo -------------------------------------------------------

  if (itens.length === 0) {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div className="flex flex-col items-center">
          <ShoppingBag className="size-12 text-faint" strokeWidth={1.5} aria-hidden="true" />
          <p className="mt-3 text-xl font-extrabold">Seu pedido está vazio</p>
          <Link href={`/totem/${restaurant.slug}`} className={buttonClasses("primary", "lg", "mt-6")}>
            Ver o cardápio
          </Link>
        </div>
      </div>
    );
  }

  const escolha = (marcada: boolean) =>
    cn(
      "flex flex-1 cursor-pointer items-center gap-3 rounded-control border px-4 py-4 text-left",
      marcada ? "border-brand bg-brand-soft" : "border-line bg-surface-2 hover:border-line-strong",
    );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 p-4 pb-28">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Seu pedido</h1>
        <Link href={`/totem/${restaurant.slug}`} className={buttonClasses("secondary", "sm")}>
          Continuar escolhendo
        </Link>
      </header>

      <Card className="flex flex-col gap-3">
        {itens.map((item) => (
          <div key={item.key} className="flex items-start justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
            <span className="min-w-0">
              <span className="block font-bold">{item.name}</span>
              {item.optionsText && <span className="block text-sm text-brand">{item.optionsText}</span>}
              {item.notes && <span className="block text-sm text-muted">Obs.: {item.notes}</span>}
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <QuantityStepper value={item.quantity} onChange={(q) => setQuantity(item.key, q)} allowRemove label={item.name} />
              <span className="w-20 text-right font-extrabold tabular-nums">{formatCents(item.unitPriceCents * item.quantity)}</span>
            </span>
          </div>
        ))}
        <p className="flex items-center justify-between text-lg font-extrabold">
          <span>Total</span>
          <span className="tabular-nums">{formatCents(subtotal)}</span>
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-extrabold">Vai comer aqui ou levar?</h2>
        <div className="flex flex-wrap gap-3">
          <label className={escolha(comerAqui === true)}>
            <input
              type="radio"
              name="comerAqui"
              checked={comerAqui === true}
              onChange={() => setComerAqui(true)}
              className="size-4 accent-brand"
            />
            <UtensilsCrossed className="size-5 shrink-0 text-brand" aria-hidden="true" />
            <span className="font-bold">Comer aqui</span>
          </label>
          <label className={escolha(comerAqui === false)}>
            <input
              type="radio"
              name="comerAqui"
              checked={comerAqui === false}
              onChange={() => setComerAqui(false)}
              className="size-4 accent-brand"
            />
            <ShoppingBag className="size-5 shrink-0 text-brand" aria-hidden="true" />
            <span className="font-bold">Levar</span>
          </label>
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-extrabold">Como quer pagar?</h2>
        <p className="-mt-2 text-sm text-muted">No totem não recebemos dinheiro.</p>
        <div className="flex flex-wrap gap-3">
          <label className={escolha(forma === "cartao")}>
            <input
              type="radio"
              name="forma"
              checked={forma === "cartao"}
              onChange={() => setForma("cartao")}
              className="size-4 accent-brand"
            />
            <CreditCard className="size-5 shrink-0 text-brand" aria-hidden="true" />
            <span>
              <span className="block font-bold">Cartão</span>
              <span className="block text-sm text-muted">Na maquininha ao lado.</span>
            </span>
          </label>
          <label className={escolha(forma === "pix")}>
            <input type="radio" name="forma" checked={forma === "pix"} onChange={() => setForma("pix")} className="size-4 accent-brand" />
            <QrCode className="size-5 shrink-0 text-brand" aria-hidden="true" />
            <span>
              <span className="block font-bold">Pix</span>
              <span className="block text-sm text-muted">O código aparece aqui na tela.</span>
            </span>
          </label>
        </div>
      </Card>

      <Card>
        <Field label="Seu nome" htmlFor="nome" hint="É o nome que chamamos quando o pedido ficar pronto.">
          <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={40} autoComplete="off" />
        </Field>
      </Card>

      {erro && <Alert tone="danger">{erro}</Alert>}
      {precisaAtivar && (
        <p className="text-center text-sm text-muted">
          É o dono do restaurante?{" "}
          <Link href={`/totem/${restaurant.slug}?ativar=1`} className="font-bold text-brand underline">
            Ativar este aparelho
          </Link>{" "}
          com o código que o painel gera, na aba Totem.
        </p>
      )}
      {!aberto && <Alert tone="warning">O restaurante está fechado agora. Chame um atendente.</Alert>}
      {falta > 0 && <Alert tone="warning">Faltam {formatCents(falta)} para o pedido mínimo.</Alert>}

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <span className="text-lg font-extrabold tabular-nums">{formatCents(subtotal)}</span>
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            onClick={confirmar}
            disabled={!aberto || falta > 0}
          >
            Confirmar e pagar
          </Button>
        </div>
      </div>
    </div>
  );
}
