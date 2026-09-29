import { BellRing, Plus, ShoppingBag } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

// Maquetes das três telas do sistema, desenhadas aqui mesmo em HTML: não
// desbotam, acompanham o tema e continuam legíveis numa tela de 390px.
//
// TODO (opcional): trocar por prints de verdade do sistema. Seriam três:
//   1. cardápio aberto no celular do cliente
//   2. painel de pedidos com um pedido novo chegando
//   3. foto da via saindo da impressora térmica
// Se um dia entrarem, salve em /public/vitrine/ e troque o miolo de cada
// <Moldura> por <Image src="/vitrine/....webp" .../>.

/** moldura de celular, com o entalhe em cima */
function Moldura({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[13.5rem] rounded-[1.75rem] border border-line-strong bg-surface-3 p-1.5",
        "shadow-[0_18px_40px_-12px_rgb(0_0_0/0.7)]",
        className,
      )}
    >
      <div className="overflow-hidden rounded-[1.35rem] bg-bg">
        <div className="flex justify-center pt-1.5 pb-0.5">
          <span className="h-1 w-10 rounded-full bg-surface-3" aria-hidden="true" />
        </div>
        {children}
      </div>
    </div>
  );
}

const PRATOS = [
  { nome: "X-Burger", preco: "22,00", foto: "/demo/burger/x-burger.webp" },
  { nome: "Batata frita", preco: "18,00", foto: "/demo/burger/batata-frita.webp" },
  { nome: "Milkshake", preco: "14,00", foto: "/demo/burger/milkshake.webp" },
];

/** 1. o cardápio como o cliente vê */
export function TelaDoCardapio() {
  return (
    <Moldura>
      <div className="flex items-center gap-1.5 px-2.5 py-2">
        <Image src="/demo/burger/logo.webp" alt="" width={48} height={48} className="size-6 shrink-0 rounded-full object-cover" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.6rem] leading-tight font-extrabold">Burger do Zé</span>
          <span className="block text-[0.5rem] leading-tight text-success">Aberto agora</span>
        </span>
      </div>
      <div className="flex gap-1 px-2.5 pb-1.5">
        {["Lanches", "Porções", "Bebidas"].map((c, i) => (
          <span
            key={c}
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[0.48rem] font-bold",
              i === 0 ? "bg-brand text-brand-ink" : "bg-surface-2 text-muted",
            )}
          >
            {c}
          </span>
        ))}
      </div>
      <ul className="flex flex-col gap-1 px-2 pb-1.5">
        {PRATOS.map((p) => (
          <li key={p.nome} className="flex items-center gap-1.5 rounded-lg border border-line bg-surface p-1">
            <Image src={p.foto} alt="" width={80} height={80} className="size-8 shrink-0 rounded-md object-cover" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.55rem] leading-tight font-bold">{p.nome}</span>
              <span className="block text-[0.55rem] leading-tight font-extrabold text-brand">R$ {p.preco}</span>
            </span>
            <span className="grid size-4 shrink-0 place-items-center rounded-md bg-brand text-brand-ink" aria-hidden="true">
              <Plus className="size-2.5" strokeWidth={3} />
            </span>
          </li>
        ))}
      </ul>
      <div className="px-2 pb-2">
        <span className="flex h-6 items-center justify-center gap-1 rounded-lg bg-brand text-[0.55rem] font-extrabold text-brand-ink">
          <ShoppingBag className="size-2.5" aria-hidden="true" />
          Ver carrinho · R$ 54,00
        </span>
      </div>
    </Moldura>
  );
}

/** 2. o painel do restaurante quando entra pedido */
export function TelaDoPainel() {
  return (
    <Moldura>
      <div className="flex items-center justify-between px-2.5 py-2">
        <span className="text-[0.6rem] font-extrabold">Pedidos</span>
        <span className="relative grid size-5 place-items-center rounded-full bg-brand-soft text-brand" aria-hidden="true">
          <BellRing className="size-3" />
          <span className="absolute -top-0.5 -right-0.5 size-1.5 animate-pulse rounded-full bg-danger" />
        </span>
      </div>
      <div className="px-2 pb-2">
        <div className="rounded-lg border border-brand/60 bg-brand-soft p-1.5">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-brand px-1.5 py-px text-[0.45rem] font-extrabold text-brand-ink">PEDIDO NOVO</span>
            <span className="text-[0.5rem] font-bold text-muted">19:24</span>
          </div>
          <p className="mt-1 text-[0.6rem] font-extrabold">#42 · Entrega</p>
          <p className="text-[0.5rem] leading-tight text-muted">Maria · Rua das Flores, 120</p>
          <ul className="mt-1 flex flex-col gap-px border-t border-line pt-1 text-[0.52rem] leading-tight">
            <li className="flex justify-between gap-1">
              <span className="truncate">2x X-Burger</span>
              <span className="font-bold">44,00</span>
            </li>
            <li className="pl-2 text-[0.46rem] text-faint">sem cebola</li>
            <li className="flex justify-between gap-1">
              <span className="truncate">1x Batata frita</span>
              <span className="font-bold">18,00</span>
            </li>
          </ul>
          <div className="mt-1 flex justify-between border-t border-line pt-1 text-[0.58rem] font-extrabold">
            <span>Total</span>
            <span className="text-brand">R$ 62,00</span>
          </div>
        </div>
        <span className="mt-1.5 flex h-6 items-center justify-center rounded-lg bg-brand text-[0.55rem] font-extrabold text-brand-ink">
          Aceitar pedido
        </span>
      </div>
      {/* pedido antigo, só para dar profundidade à lista */}
      <div className="border-t border-line px-2 py-1.5 opacity-50">
        <div className="flex justify-between text-[0.52rem]">
          <span className="font-bold">#41 · Retirada</span>
          <span className="text-success">Pronto</span>
        </div>
      </div>
    </Moldura>
  );
}

const LINHAS = [
  ["2x X-Burger", "44,00"],
  ["1x Batata frita", "18,00"],
];

/** 3. a via que sai na impressora do balcão */
export function ViaImpressa() {
  return (
    <div className="mx-auto w-full max-w-[12.5rem] drop-shadow-[0_18px_30px_rgb(0_0_0/0.6)]">
      <div className="rounded-t-sm bg-[#f7f5ef] px-3 pt-3 pb-2 font-mono text-[0.55rem] leading-[1.5] text-[#15181d]">
        <p className="text-center text-[0.72rem] font-bold tracking-wide">BURGER DO ZE</p>
        <p className="text-center">Rua Principal, 45</p>
        <p className="my-1 overflow-hidden text-[#9aa0a6]">------------------------------</p>
        <div className="flex justify-between font-bold">
          <span>PEDIDO #42</span>
          <span>19:24</span>
        </div>
        <p>ENTREGA</p>
        <p>Maria - (92) 99999-0000</p>
        <p className="my-1 overflow-hidden text-[#9aa0a6]">------------------------------</p>
        {LINHAS.map(([item, valor]) => (
          <div key={item} className="flex justify-between gap-2">
            <span className="truncate">{item}</span>
            <span>{valor}</span>
          </div>
        ))}
        <p className="pl-3 text-[0.5rem]">* sem cebola</p>
        <p className="my-1 overflow-hidden text-[#9aa0a6]">------------------------------</p>
        <div className="flex justify-between font-bold">
          <span>TOTAL</span>
          <span>62,00</span>
        </div>
        <p>Dinheiro - troco p/ 100,00</p>
        <p className="font-bold">TROCO: 38,00</p>
        <p className="my-1 overflow-hidden text-[#9aa0a6]">------------------------------</p>
        <p>Rua das Flores, 120</p>
        <p>Centro - ponto: perto da praca</p>
      </div>
      {/* borda serrilhada: o papel destacado da bobina */}
      <svg viewBox="0 0 120 6" preserveAspectRatio="none" className="block h-2 w-full" aria-hidden="true">
        <path d="M0 0h120v1L114 6 108 1 102 6 96 1 90 6 84 1 78 6 72 1 66 6 60 1 54 6 48 1 42 6 36 1 30 6 24 1 18 6 12 1 6 6 0 1Z" fill="#f7f5ef" />
      </svg>
    </div>
  );
}
