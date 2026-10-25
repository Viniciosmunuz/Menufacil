"use client";

import { Pencil, UserMinus, X } from "lucide-react";
import { useActionState, useState } from "react";

import { editarGarcom, tirarGarcomDaEquipe, type SalaoFormState } from "@/app/painel/[restaurantId]/salao/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import type { NivelGarcom } from "@/generated/prisma/enums";
import { NIVEIS } from "@/lib/niveis";
import { doNivel, GRUPOS, TODAS, type PermissoesDoSalao } from "@/lib/permissoes-salao";

// O que um garçom pode fazer, mudado pelo lápis da linha dele.
//
// Os dois níveis continuam em cima, mas agora como atalho: tocar em
// "Garçom II" liga todas as chaves de uma vez, e tocar em "Garçom" deixa
// só o que é atender. Embaixo, o dono acerta uma por uma -- há casa que
// deixa o garçom dar desconto e não apagar comanda, e o contrário também.
//
// Lançar pedido e receber pagamento não são chaves: é o trabalho do
// garçom, e um garçom que não pode fazer isso não precisava de conta.
//
// Tirar da equipe fica aqui dentro, e não como um segundo ícone na linha:
// são dois gestos para a mesma pessoa, e um X ao lado do lápis, num celular
// no meio do movimento, é longe demais de "nunca mais lança pedido".

export function PermissoesDoGarcom({
  restaurantId,
  vinculoId,
  nome,
  nivel,
  permissoes,
}: {
  restaurantId: string;
  vinculoId: string;
  nome: string | null;
  nivel: NivelGarcom;
  permissoes: PermissoesDoSalao;
}) {
  const [abrindo, setAbrindo] = useState(false);
  const [tirando, setTirando] = useState(false);
  const [escolhido, setEscolhido] = useState<NivelGarcom>(nivel);
  const [chaves, setChaves] = useState<PermissoesDoSalao>(permissoes);
  const [estado, salvar] = useActionState<SalaoFormState, FormData>(editarGarcom, {});
  const [saida, tirar] = useActionState<SalaoFormState, FormData>(tirarGarcomDaEquipe, {});

  // salvou: o painel fecha e a linha volta a mostrar o que ficou valendo,
  // porque a ação revalida a página
  const [ultimo, setUltimo] = useState<string | undefined>(undefined);
  if (estado.ok && estado.message !== ultimo) {
    setUltimo(estado.message);
    setAbrindo(false);
  }

  // o nível é um atalho: tocar nele preenche as chaves de uma vez
  const usarNivel = (n: NivelGarcom) => {
    setEscolhido(n);
    setChaves(doNivel(n));
  };

  const ligadas = TODAS.filter((c) => chaves[c]).length;

  if (!abrindo) {
    return (
      <button
        type="button"
        onClick={() => setAbrindo(true)}
        aria-label={"Mudar o que " + (nome ?? "este garçom") + " pode fazer"}
        className="grid size-9 shrink-0 place-items-center rounded-control text-faint hover:text-ink"
      >
        <Pencil className="size-4" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-control border border-line bg-surface-2 p-3">
      <form action={salvar} className="flex flex-col gap-4">
        <input type="hidden" name="restaurantId" value={restaurantId} />
        <input type="hidden" name="vinculoId" value={vinculoId} />
        <input type="hidden" name="nivel" value={escolhido} />

        <div className="flex items-start justify-between gap-3">
          <p className="font-extrabold">O que {nome ?? "este garçom"} pode fazer</p>
          <button
            type="button"
            onClick={() => setAbrindo(false)}
            aria-label="Cancelar"
            className="grid size-8 shrink-0 place-items-center rounded-control text-muted hover:text-ink"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Nível">
          {NIVEIS.map((n) => {
            const aceso = escolhido === n.chave;
            return (
              <button
                key={n.chave}
                type="button"
                role="radio"
                aria-checked={aceso}
                onClick={() => usarNivel(n.chave)}
                className={
                  "rounded-control border p-3 text-left transition-colors " +
                  (aceso ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-line-strong")
                }
              >
                <span className={aceso ? "block font-extrabold text-brand" : "block font-extrabold"}>{n.nome}</span>
                <span className="block text-sm text-muted">{n.resumo}</span>
              </button>
            );
          })}
        </div>

        {/* e, se o dono quiser acertar o fio, chave por chave */}
        <div className="flex flex-col gap-4 border-t border-line pt-3">
          <p className="text-sm text-muted">
            {ligadas === 0
              ? "Só lança pedido e recebe pagamento."
              : ligadas === TODAS.length
                ? "Faz na mesa tudo o que você faz."
                : `Além de lançar e receber, pode ${ligadas} ${ligadas === 1 ? "coisa" : "coisas"}.`}
          </p>

          {GRUPOS.map((g) => (
            <div key={g.titulo} className="flex flex-col gap-1">
              <p className="text-xs font-bold tracking-wide text-faint uppercase">{g.titulo}</p>
              {g.chaves.map((c) => {
                const aceso = chaves[c.chave];
                return (
                  <label key={c.chave} className="flex cursor-pointer items-start gap-3 rounded-control px-1 py-2 hover:bg-surface">
                    <input type="checkbox" name={c.chave} checked={aceso} onChange={(e) => setChaves({ ...chaves, [c.chave]: e.target.checked })} className="sr-only" />
                    <span
                      className={
                        "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors " +
                        (aceso ? "border-success/60 bg-success/80" : "border-line-strong bg-surface-3")
                      }
                      aria-hidden="true"
                    >
                      <span className={"absolute size-4 rounded-full bg-ink shadow transition-transform " + (aceso ? "translate-x-[1.4rem]" : "translate-x-1")} />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{c.nome}</span>
                      <span className="block text-sm text-muted">{c.resumo}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          ))}
        </div>

        {estado.error && (
          <p className="rounded-control bg-danger/15 px-3 py-2 text-sm font-bold text-danger" role="status">
            {estado.error}
          </p>
        )}

        <div>
          <SubmitButton pendingText="Salvando...">Salvar</SubmitButton>
        </div>
      </form>

      <div className="border-t border-line pt-3">
        {!tirando ? (
          <button
            type="button"
            onClick={() => setTirando(true)}
            className="flex min-h-11 items-center gap-2 rounded-control px-1 text-sm font-bold text-danger"
          >
            <UserMinus className="size-4" aria-hidden="true" />
            Tirar da equipe
          </button>
        ) : (
          <form action={tirar} className="flex flex-col gap-3">
            <input type="hidden" name="restaurantId" value={restaurantId} />
            <input type="hidden" name="vinculoId" value={vinculoId} />

            <div>
              <p className="font-extrabold">Tirar {nome ?? "este garçom"} da equipe?</p>
              <p className="text-sm text-muted">
                O aparelho perde o acesso na hora e não lança mais pedido. As mesas já atendidas continuam no nome de{" "}
                {nome ?? "quem atendeu"}, e, se voltar a trabalhar aqui, é só cadastrar o mesmo CPF de novo.
              </p>
            </div>

            {saida.error && (
              <p className="rounded-control bg-danger/15 px-3 py-2 text-sm font-bold text-danger" role="status">
                {saida.error}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <SubmitButton pendingText="Tirando..." variant="danger">
                Sim, tirar
              </SubmitButton>
              <button
                type="button"
                onClick={() => setTirando(false)}
                className="min-h-11 rounded-control px-4 font-bold text-muted"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
