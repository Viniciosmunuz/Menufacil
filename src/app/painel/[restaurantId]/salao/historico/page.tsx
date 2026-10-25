import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ListaDoHistorico, NOME_DO_TIPO, ResumoDoHistorico } from "@/components/panel/historico-salao";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { startOfToday, todayKey } from "@/lib/format";
import { requireSalao } from "@/server/auth/dal";
import { intervaloDoDia, lerHistorico, rotuloDaMesa, type TipoDaLinha } from "@/server/salao/historico";

export const metadata: Metadata = { title: "Histórico do salão" };

// O histórico do salão, visto pelo dono: tudo, de todo mundo, de todas as
// mesas -- pedido lançado, pagamento, item apagado, mesa trocada, caixa
// aberto e fechado, mudança na equipe.
//
// Um dia por vez, que é como o dono confere ("o que aconteceu ontem à
// noite?"), com filtro por pessoa, por mesa e por tipo. O garçom não chega
// aqui: o painel inteiro exige papel de dono no servidor, e ele tem o
// histórico dele no celular.

const DIA = /^\d{4}-\d{2}-\d{2}$/;
const TIPOS = Object.keys(NOME_DO_TIPO) as TipoDaLinha[];

/** meia-noite do dia "2026-10-25" no fuso da plataforma */
const inicioDe = (dia: string) => startOfToday(new Date(`${dia}T16:00:00Z`));

/** o dia ao lado, em "2026-10-24" */
const outroDia = (dia: string, passo: number) => todayKey(new Date(new Date(`${dia}T16:00:00Z`).getTime() + passo * 24 * 60 * 60 * 1000));

export default async function HistoricoDoSalaoPage({ params, searchParams }: PageProps<"/painel/[restaurantId]/salao/historico">) {
  const { restaurantId } = await params;
  const { restaurant } = await requireSalao(restaurantId);
  const busca = await searchParams;
  const base = `/painel/${restaurant.id}/salao`;

  const hoje = todayKey();
  const pedido = typeof busca.dia === "string" && DIA.test(busca.dia) ? busca.dia : hoje;
  const dia = pedido > hoje ? hoje : pedido;
  const pessoa = typeof busca.pessoa === "string" ? busca.pessoa : "";
  const mesaId = typeof busca.mesa === "string" ? busca.mesa : "";
  const tipo = typeof busca.tipo === "string" && TIPOS.includes(busca.tipo as TipoDaLinha) ? (busca.tipo as TipoDaLinha) : null;

  const [todas, mesas] = await Promise.all([
    lerHistorico(restaurant.id, intervaloDoDia(inicioDe(dia))),
    db.mesa.findMany({ where: { restaurantId: restaurant.id }, orderBy: [{ tipo: "asc" }, { numero: "asc" }], select: { id: true, tipo: true, numero: true, nome: true } }),
  ]);

  // quem aparece no filtro é quem fez alguma coisa no dia: a equipe inteira
  // numa lista, num dia em que dois trabalharam, só esconde os dois
  const pessoas = [...new Map(todas.filter((l) => l.quemId).map((l) => [l.quemId!, l.quem])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const linhas = todas.filter((l) => (!pessoa || l.quemId === pessoa) && (!mesaId || l.mesaId === mesaId) && (!tipo || l.tipo === tipo));

  const link = (mudar: Record<string, string>) => {
    const q = new URLSearchParams({ ...(dia !== hoje ? { dia } : {}), ...(pessoa ? { pessoa } : {}), ...(mesaId ? { mesa: mesaId } : {}), ...(tipo ? { tipo } : {}) });
    for (const [k, v] of Object.entries(mudar)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    const s = q.toString();
    return `${base}/historico${s ? "?" + s : ""}`;
  };

  const nomeDoDia =
    dia === hoje
      ? "Hoje"
      : dia === outroDia(hoje, -1)
        ? "Ontem"
        : new Date(`${dia}T16:00:00Z`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });

  // os campos do painel são de linha inteira; aqui os quatro dividem uma
  // linha só no computador, então o desenho é o mesmo e a largura não
  const campo =
    "h-11 rounded-control border border-line bg-surface px-3 text-base text-ink transition-colors hover:border-line-strong focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none";
  const seletor = cn(campo, "min-w-0 flex-1 basis-40 sm:flex-none sm:basis-auto sm:w-48");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={base} aria-label="Voltar ao salão" className="grid size-10 shrink-0 place-items-center rounded-control border border-line text-muted hover:text-ink">
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <h1 className="flex-1 text-3xl font-extrabold">Histórico</h1>

        {/* o dia: um passo para trás, um para a frente, ou um dia qualquer */}
        <div className="flex items-center gap-1 rounded-control border border-line bg-surface p-1">
          <Link href={link({ dia: outroDia(dia, -1) })} aria-label="Dia anterior" className="grid size-9 place-items-center rounded-control hover:bg-surface-2">
            <ChevronLeft className="size-5" aria-hidden="true" />
          </Link>
          <span className="min-w-24 px-2 text-center font-semibold capitalize">{nomeDoDia}</span>
          {dia < hoje ? (
            <Link href={link({ dia: outroDia(dia, 1) === hoje ? "" : outroDia(dia, 1) })} aria-label="Dia seguinte" className="grid size-9 place-items-center rounded-control hover:bg-surface-2">
              <ChevronRight className="size-5" aria-hidden="true" />
            </Link>
          ) : (
            <span className="grid size-9 place-items-center text-faint/50" aria-hidden="true">
              <ChevronRight className="size-5" />
            </span>
          )}
        </div>
      </div>

      <ResumoDoHistorico linhas={linhas} />

      {/* GET puro: o filtro vira endereço, e o dono pode voltar nele ou mandar o link */}
      <form action={`${base}/historico`} className="flex flex-wrap items-center gap-2">
        <input type="date" name="dia" defaultValue={dia} max={hoje} aria-label="Escolher o dia" className={cn(campo, "w-full sm:w-auto")} />
        <select name="pessoa" defaultValue={pessoa} aria-label="Pessoa" className={seletor}>
          <option value="">Todo mundo</option>
          {pessoas.map(([id, nome]) => (
            <option key={id} value={id}>
              {nome}
            </option>
          ))}
        </select>
        <select name="mesa" defaultValue={mesaId} aria-label="Mesa" className={seletor}>
          <option value="">Todas as mesas</option>
          {mesas.map((m) => (
            <option key={m.id} value={m.id}>
              {rotuloDaMesa(m)}
            </option>
          ))}
        </select>
        <select name="tipo" defaultValue={tipo ?? ""} aria-label="Tipo" className={seletor}>
          <option value="">Tudo</option>
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {NOME_DO_TIPO[t]}
            </option>
          ))}
        </select>
        <button type="submit" className="h-11 rounded-control bg-brand px-5 font-bold text-brand-ink hover:brightness-105">
          Filtrar
        </button>
        {(pessoa || mesaId || tipo) && (
          <Link href={link({ pessoa: "", mesa: "", tipo: "" })} className="h-11 content-center rounded-control px-3 text-sm font-bold text-muted hover:text-ink">
            Limpar
          </Link>
        )}
      </form>

      <ListaDoHistorico
        linhas={linhas}
        vazio={todas.length === 0 ? "Nada aconteceu no salão neste dia." : "Nada com esse filtro neste dia."}
      />
    </div>
  );
}
