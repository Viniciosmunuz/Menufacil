import { Clock } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";

// Os pedidos que estão esperando alguém no balcão.
//
// Antes isto era um número igual aos outros três, no meio da fileira de
// estatísticas: "Esperando você: 3". Mas ele não é número de relatório --
// é tarefa. E no meio do movimento o que faz a pessoa largar o que está
// fazendo não é o 3, é o relógio: um pedido parado há 40 minutos é a pior
// coisa que pode acontecer num delivery, e a tela não dizia isso.
//
// O destaque é por tempo, não por quantidade. Com tudo em dia o cartão
// fica cinza e discreto; se o mais antigo passar do limite ele acende.
// Fosse colorido sempre, viraria paisagem e ninguém mais olharia.

/** a partir daqui o cartão acende: tempo de um pedido que já devia ter saído */
const MINUTOS_DE_ATENCAO = 25;

function haQuantoTempo(minutos: number) {
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `há ${horas}h` : `há ${horas}h${String(resto).padStart(2, "0")}`;
}

export function EsperandoCard({
  href,
  quantos,
  maisAntigo,
}: {
  href: string;
  quantos: number;
  /**
   * O pedido que está esperando há mais tempo, com os minutos já contados
   * no servidor -- o relógio é lido lá, onde a página é montada, e não
   * dentro do desenho.
   */
  maisAntigo: { number: number; minutos: number } | null;
}) {
  if (quantos === 0) return null;

  const minutos = maisAntigo?.minutos ?? 0;
  const atrasado = minutos >= MINUTOS_DE_ATENCAO;

  return (
    // No celular o botão desce e ocupa a largura: espremido na mesma linha
    // ele empurrava "3 pedidos esperando" para duas linhas e virava um alvo
    // pequeno justamente no aparelho em que a pessoa está com uma mão só.
    <div
      className={cn(
        "flex flex-col gap-4 rounded-card border px-5 py-4 sm:flex-row sm:items-center",
        atrasado ? "border-warning/40 bg-warning/10" : "border-line bg-surface",
      )}
    >
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-control",
          atrasado ? "bg-warning/15 text-warning" : "bg-brand-soft text-brand",
        )}
      >
        <Clock className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-xl font-extrabold", atrasado && "text-warning")}>
          {quantos} {quantos === 1 ? "pedido esperando" : "pedidos esperando"}
        </p>
        {maisAntigo && (
          <p className={cn("mt-0.5 text-sm", atrasado ? "text-warning" : "text-muted")}>
            {quantos === 1 ? "Entrou" : "O mais antigo entrou"} {haQuantoTempo(minutos)} · #{maisAntigo.number}
          </p>
        )}
      </div>
      <Link
        href={href}
        className={cn(buttonClasses(atrasado ? "primary" : "secondary", "sm"), "w-full justify-center sm:w-auto")}
      >
        Ver pedidos
      </Link>
    </div>
  );
}
