"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { competenciaLabel } from "@/lib/cobranca";

/**
 * Qual mês esta tela está mostrando, e como trocar.
 *
 * Lista só os meses em que houve venda. Doze meses fixos ofereceriam
 * telas em branco a quem abriu há pouco -- e a primeira impressão de um
 * recurso novo não pode ser uma tela vazia que parece defeito.
 *
 * O mês vive na URL, e não num estado aqui dentro: assim o dono pode
 * mandar o link de setembro para o contador, e voltar da tela de um
 * produto cai no mês em que ele estava.
 *
 * Um `select` de verdade, e não uma lista desenhada: no celular ele abre
 * a roda nativa do sistema, que é mais fácil de usar com a mão suja de
 * farinha do que qualquer coisa que eu desenhasse aqui.
 */
export function SeletorDeMes({ base, mes, meses }: { base: string; mes: string; meses: string[] }) {
  const router = useRouter();
  const [pendente, comecar] = useTransition();

  // um mês só não é escolha: vira o selo de antes, sem a roda que não
  // leva a lugar nenhum
  if (meses.length < 2) {
    return (
      <span className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-bold text-muted first-letter:uppercase">
        {competenciaLabel(mes)}
      </span>
    );
  }

  return (
    <span className="relative inline-flex items-center">
      <select
        aria-label="Mês que esta tela mostra"
        value={mes}
        disabled={pendente}
        onChange={(e) =>
          comecar(() => {
            const escolhido = e.target.value;
            // o mês corrente fica sem parâmetro: é o padrão da tela, e
            // link curto é link que se entende
            router.push(escolhido === meses[0] ? base : `${base}?mes=${escolhido}`);
          })
        }
        className="appearance-none rounded-full border border-line bg-surface py-1.5 pr-9 pl-3.5 text-sm font-bold text-ink first-letter:uppercase hover:border-line-strong focus:border-brand focus:outline-none disabled:opacity-60"
      >
        {meses.map((m) => (
          <option key={m} value={m}>
            {competenciaLabel(m)}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 size-4 text-faint"
        aria-hidden="true"
      />
    </span>
  );
}
