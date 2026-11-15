import { ExternalLink, KeyRound, Wallet } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/panel/page-header";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Anthropic" };

// O que a conta da Anthropic (a IA dos restaurantes) já gastou.
//
// A API da Anthropic não informa o saldo de créditos pré-pagos: não existe
// endpoint para isso. O que ela informa é o custo, dia a dia, pelo
// relatório de custos da Admin API (/v1/organizations/cost_report). Por
// isso esta tela mostra o gasto, e o saldo fica no link do Console.
//
// A chave é uma Admin API key (sk-ant-admin...), diferente da chave que a
// IA usa para conversar. Ela fica em ANTHROPIC_ADMIN_KEY, na Vercel.

const SALDO_NO_CONSOLE = "https://platform.claude.com/settings/billing";

type Resultado = { amount: string; currency: string; model: string | null; description: string | null };
type Balde = { starting_at: string; ending_at: string; results: Resultado[] };
type Relatorio = { data: Balde[]; has_more: boolean; next_page: string | null };

/** dólares a partir do valor em centavos que a API manda como texto */
const dolares = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

const NOMES: Record<string, string> = {
  "claude-opus-5-5": "Opus 5.5",
  "claude-sonnet-5-5": "Sonnet 5.5",
  "claude-haiku-5-5": "Haiku 5.5",
  "claude-fable-5-2": "Fable 5.2",
};

async function custosDoMes(chave: string) {
  const agora = new Date();
  const inicio = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1));
  const baldes: Balde[] = [];
  let pagina: string | null = null;

  // um mês cabe numa página (até 31 dias), mas a API pode paginar mesmo assim
  for (let volta = 0; volta < 3; volta++) {
    const url = new URL("https://api.anthropic.com/v1/organizations/cost_report");
    url.searchParams.set("starting_at", inicio.toISOString());
    url.searchParams.set("bucket_width", "1d");
    url.searchParams.set("limit", "31");
    url.searchParams.append("group_by[]", "description");
    if (pagina) url.searchParams.set("page", pagina);

    const resposta = await fetch(url, {
      headers: { "x-api-key": chave, "anthropic-version": "2026-10-21", "user-agent": "MenuFacil-Admin/1.0" },
      // o dado da Anthropic chega com alguns minutos de atraso; cinco de cache bastam
      next: { revalidate: 300 },
    });
    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => "");
      throw new Error(`${resposta.status} ${corpo.slice(0, 200)}`);
    }
    const relatorio = (await resposta.json()) as Relatorio;
    baldes.push(...relatorio.data);
    if (!relatorio.has_more || !relatorio.next_page) break;
    pagina = relatorio.next_page;
  }
  return baldes;
}

export default async function AnthropicPage() {
  await requireAdmin();
  const chave = process.env.ANTHROPIC_ADMIN_KEY?.trim();

  let baldes: Balde[] | null = null;
  let erro: string | null = null;
  if (chave) {
    try {
      baldes = await custosDoMes(chave);
    } catch (e) {
      erro = e instanceof Error ? e.message : String(e);
      console.warn("[admin/anthropic] o relatório de custos falhou:", erro);
    }
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const total = (b: Balde) => b.results.reduce((s, r) => s + Number(r.amount || 0), 0);
  const noMes = baldes?.reduce((s, b) => s + total(b), 0) ?? 0;
  const deHoje = baldes?.filter((b) => b.starting_at.slice(0, 10) === hoje).reduce((s, b) => s + total(b), 0) ?? 0;

  const porModelo = new Map<string, number>();
  for (const b of baldes ?? [])
    for (const r of b.results) {
      const nome = r.model ? (NOMES[r.model] ?? r.model) : "Outros (busca, ferramentas)";
      porModelo.set(nome, (porModelo.get(nome) ?? 0) + Number(r.amount || 0));
    }
  const modelos = [...porModelo.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const dias = (baldes ?? []).filter((b) => total(b) > 0).reverse();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Anthropic"
        actions={
          <a
            href={SALDO_NO_CONSOLE}
            target="_blank"
            rel="noopener"
            className="inline-flex h-10 items-center gap-2 rounded-control border border-line bg-surface-2 px-4 text-sm font-bold"
          >
            <Wallet className="size-4" aria-hidden="true" />
            Ver o saldo no Console
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        }
      />

      {!chave && (
        <Card className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <KeyRound className="size-5 text-brand" aria-hidden="true" />
            Falta a chave de administrador
          </h2>
          <p className="text-sm text-muted">
            Crie uma Admin API key no Console da Anthropic (Settings, Admin keys) e cadastre na Vercel com o nome{" "}
            <code className="font-bold text-ink">ANTHROPIC_ADMIN_KEY</code>. Não é a mesma chave que a IA usa.
          </p>
        </Card>
      )}

      {erro && <Alert tone="danger">A Anthropic não devolveu o relatório: {erro}</Alert>}

      {baldes && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Card className="flex flex-col gap-1">
              <p className="text-sm font-bold text-muted">Gasto hoje</p>
              <p className="text-3xl font-extrabold tabular-nums">{dolares(deHoje)}</p>
            </Card>
            <Card className="flex flex-col gap-1">
              <p className="text-sm font-bold text-muted">Gasto neste mês</p>
              <p className="text-3xl font-extrabold tabular-nums">{dolares(noMes)}</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <Card className="flex flex-col gap-3">
              <h2 className="text-lg font-extrabold">Por modelo, no mês</h2>
              {modelos.length === 0 ? (
                <p className="text-sm text-muted">Nada gasto neste mês ainda.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-line">
                  {modelos.map(([nome, valor]) => (
                    <li key={nome} className="flex items-center justify-between py-2 text-sm">
                      <span className="font-bold">{nome}</span>
                      <span className="tabular-nums">{dolares(valor)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="flex flex-col gap-3">
              <h2 className="text-lg font-extrabold">Dia a dia</h2>
              {dias.length === 0 ? (
                <p className="text-sm text-muted">Nada gasto neste mês ainda.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-line">
                  {dias.map((b) => (
                    <li key={b.starting_at} className="flex items-center justify-between py-2 text-sm">
                      <span className="font-bold">
                        {b.starting_at.slice(8, 10)}/{b.starting_at.slice(5, 7)}
                      </span>
                      <span className="tabular-nums">{dolares(total(b))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          <p className="text-xs text-faint">Valores em dólar, como a Anthropic cobra. Atualiza a cada 5 minutos.</p>
        </>
      )}
    </div>
  );
}
