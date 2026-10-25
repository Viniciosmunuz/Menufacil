import { Check, Clock, ClipboardList, CircleDollarSign, ConciergeBell } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";
import type { LugarNoMapa } from "@/server/salao/mesas";

// Um lugar no mapa do salão, no jeito do Yooga -- que é o que o Papaléguas
// já usa no balcão, então o caixa olha e reconhece sem aprender nada.
//
// A cor diz o estado de longe, com a faixa grossa do lado esquerdo, e a
// etiqueta com ícone confirma de perto:
//
//   Livre           cinza    ninguém na mesa
//   Aberta          verde    comanda aberta, com o valor e há quanto tempo
//   Em atendimento  roxo     um garçom está com a mesa aberta no celular agora
//   Paga            azul     pagamento lançado, falta finalizar a mesa
//
// As cores são fixas, e não as do tema: são as mesmas do Yooga, e o caixa
// já lê "verde = tem gente" sem pensar.

type Estado = "LIVRE" | "ABERTA" | "ATENDIMENTO" | "PAGA";

const ESTILO: Record<Estado, { cartao: string; palavra: string; icone: ReactNode }> = {
  LIVRE: {
    cartao: "border-[#c9cbd0] border-l-[#7d828a] bg-[#e4e5e8] hover:border-[#a9acb3]",
    palavra: "Livre",
    icone: <Check className="size-4" aria-hidden="true" />,
  },
  ABERTA: {
    cartao: "border-[#5fcf8c] border-l-[#1e9a52] bg-[#c3f0d4] hover:border-[#22a55a]",
    palavra: "Aberta",
    icone: <ClipboardList className="size-4" aria-hidden="true" />,
  },
  ATENDIMENTO: {
    cartao: "border-[#a996ec] border-l-[#6f4fd8] bg-[#e4dcfb] hover:border-[#7c5ce0]",
    palavra: "Em atendimento",
    icone: <ConciergeBell className="size-4" aria-hidden="true" />,
  },
  PAGA: {
    cartao: "border-[#8fbcf0] border-l-[#2f7de1] bg-[#d7e8fc] hover:border-[#2f7de1]",
    palavra: "Paga",
    icone: <CircleDollarSign className="size-4" aria-hidden="true" />,
  },
};

/** "40 Minutos", "Uma Hora", "2 Horas" -- como o Yooga escreve */
export function tempoDeMesa(minutos: number) {
  if (minutos < 60) return minutos === 1 ? "1 Minuto" : `${minutos} Minutos`;
  const horas = Math.floor(minutos / 60);
  return horas === 1 ? "Uma Hora" : `${horas} Horas`;
}

function estadoDe(lugar: LugarNoMapa): Estado {
  // o garçom com a mesa na mão manda mais que a conta: é o que o caixa
  // precisa saber antes de mexer nela
  if (lugar.emAtendimentoPor) return "ATENDIMENTO";
  if (lugar.status === "PAGO") return "PAGA";
  if (lugar.status === "OCUPADA") return "ABERTA";
  return "LIVRE";
}

export function MesaCard({ lugar, href }: { lugar: LugarNoMapa; href: string }) {
  const estado = estadoDe(lugar);
  const estilo = ESTILO[estado];
  const rotulo = lugar.nome ?? `${lugar.tipo === "BALCAO" ? "Balcão" : "Mesa"} ${lugar.numero}`;
  const temConta = lugar.status !== "LIVRE";

  return (
    <Link
      href={href}
      aria-label={`${rotulo}: ${estilo.palavra.toLowerCase()}${temConta ? `, ${formatCents(lugar.centavos)}` : ""}${lugar.emAtendimentoPor ? `, com ${lugar.emAtendimentoPor}` : ""}`}
      title={lugar.emAtendimentoPor ? `Com ${lugar.emAtendimentoPor} agora` : undefined}
      className={cn(
        "flex min-h-28 flex-col rounded-md border-2 border-l-[6px] p-3.5 text-[#1d2026] transition-colors lg:min-h-36 lg:p-4",
        estilo.cartao,
      )}
    >
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold">
        {estilo.icone}
        {estilo.palavra}
      </span>

      <span className="mt-3 truncate text-base font-extrabold lg:text-lg">{rotulo}</span>

      {/* a mesa livre não mostra R$ 0,00: zero não é informação, é ruído
          numa grade onde metade das mesas está vazia */}
      {temConta && (
        <span className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-sm">
          <span className="tabular-nums">{formatCents(lugar.centavos)}</span>
          {lugar.minutos !== null && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-4" aria-hidden="true" />
              {tempoDeMesa(lugar.minutos)}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}
