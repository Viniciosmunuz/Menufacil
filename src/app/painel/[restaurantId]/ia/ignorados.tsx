"use client";

import { BellRing, Plus, Trash2, UserX } from "lucide-react";
import { memo, useActionState, useCallback, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Gaveta } from "@/components/ui/gaveta";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatPhone } from "@/lib/format";

import { salvarListas, type EstadoDaAcao } from "./actions";

// As duas listas de números da IA.
//
// O WhatsApp do restaurante é quase sempre o celular do dono: ali chega a
// mãe dele, a namorada, o fornecedor. Sem lista, a IA responde todos com o
// cardápio.
//
// A segunda lista existe por causa de um freio: quando alguém responde
// pelo celular, a IA cala naquela conversa por 30 minutos, para não falar
// por cima da pessoa. É o certo no dia a dia -- e é um estorvo quando o
// dono está testando com alguém conhecido, trocando mensagem dos dois
// lados. Nos números de teste o freio não vale.

type Linha = { chave: string; numero: string; nome: string; avisar: boolean };

/**
 * Uma linha de contato: o nome, o número e a chave do aviso.
 *
 * O nome vem primeiro, e não o número, porque é por ele que o dono acha
 * quem procura. Uma coluna de telefones não diz nada a quem abre esta
 * tela seis meses depois -- "Padaria" diz.
 *
 * Fora do componente de cima e com memo, como no cadastro de bairros: sem
 * isso, uma tecla digitada redesenha a lista inteira.
 */
const LinhaDeNumero = memo(function LinhaDeNumero({
  linha,
  campo,
  rotulo,
  mexer,
  tirar,
}: {
  linha: Linha;
  campo: string;
  rotulo: string;
  mexer: (chave: string, parte: Partial<Linha>) => void;
  tirar: (chave: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-card border border-line p-3">
      <div className="flex items-center gap-3">
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
          <Input
            name={`${campo}-nome`}
            aria-label={`${rotulo}: nome`}
            placeholder="Padaria"
            maxLength={60}
            value={linha.nome}
            onChange={(e) => mexer(linha.chave, { nome: e.target.value })}
          />
          <Input
            name={campo}
            type="tel"
            inputMode="tel"
            aria-label={`${rotulo}: número`}
            placeholder="(92) 99999-0000"
            maxLength={20}
            value={linha.numero}
            onChange={(e) => mexer(linha.chave, { numero: e.target.value })}
          />
        </div>
        <button
          type="button"
          onClick={() => tirar(linha.chave)}
          aria-label={`Tirar ${linha.nome || linha.numero || rotulo} da lista`}
          className="grid size-11 shrink-0 place-items-center rounded-control border border-line text-faint transition-colors hover:border-danger hover:text-danger"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>

      {/* O valor vai num campo escondido, e não na caixinha: caixinha
          desmarcada não é enviada pelo navegador, e aí a lista de avisos
          chegaria mais curta que a de números -- o aviso da padaria
          acabaria colado no telefone de outra pessoa. */}
      <input type="hidden" name={`${campo}-avisar`} value={linha.avisar ? "1" : "0"} />
      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={linha.avisar}
          onChange={(e) => mexer(linha.chave, { avisar: e.target.checked })}
          className="size-4 accent-brand"
        />
        <BellRing className="size-3.5 shrink-0 text-faint" aria-hidden="true" />
        Avisar no painel quando escrever
      </label>
    </div>
  );
});

/** uma das listas: o texto, as linhas e o botão de acrescentar */
function Lista({
  campo,
  titulo,
  explicacao,
  vazia,
  linhas,
  setLinhas,
}: {
  campo: string;
  titulo: string;
  explicacao: string;
  vazia: string;
  linhas: Linha[];
  setLinhas: React.Dispatch<React.SetStateAction<Linha[]>>;
}) {
  const mexer = useCallback(
    (chave: string, parte: Partial<Linha>) =>
      setLinhas((l) => l.map((x) => (x.chave === chave ? { ...x, ...parte } : x))),
    [setLinhas],
  );
  const tirar = useCallback(
    (chave: string) => setLinhas((l) => l.filter((x) => x.chave !== chave)),
    [setLinhas],
  );

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="font-extrabold">{titulo}</p>
        <p className="mt-1 text-sm text-muted">{explicacao}</p>
      </div>

      {linhas.length === 0 ? (
        <p className="text-sm text-faint">{vazia}</p>
      ) : (
        linhas.map((linha, i) => (
          <LinhaDeNumero
            key={linha.chave}
            linha={linha}
            campo={campo}
            rotulo={`${titulo}, número ${i + 1}`}
            mexer={mexer}
            tirar={tirar}
          />
        ))
      )}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="self-start"
        onClick={() =>
          setLinhas((l) => [
            ...l,
            { chave: `${campo}-${Date.now()}-${l.length}`, numero: "", nome: "", avisar: false },
          ])
        }
      >
        <Plus className="size-4" aria-hidden="true" />
        Adicionar contato
      </Button>
    </div>
  );
}

/** o que está salvo, do jeito que a tela edita */
export type ContatoIgnorado = { numero: string; nome: string | null; avisar: boolean };

const paraLinhas = (contatos: ContatoIgnorado[], prefixo: string) =>
  contatos.map((c, i) => ({
    chave: `${prefixo}-${i}`,
    numero: formatPhone(c.numero),
    nome: c.nome ?? "",
    avisar: c.avisar,
  }));

export function ListasDaIa({
  restaurantId,
  ignorados,
}: {
  restaurantId: string;
  ignorados: ContatoIgnorado[];
}) {
  const [state, action] = useActionState<EstadoDaAcao, FormData>(
    salvarListas,
    {},
  );
  const [linhasIgnorados, setIgnorados] = useState<Linha[]>(() =>
    paraLinhas(ignorados, "ign"),
  );

  /**
   * O botão só existe quando há o que salvar.
   *
   * Fora das gavetas ele ficava solto no meio da pilha, entre as duas
   * listas e a gaveta das conversas, parecendo pertencer à de baixo.
   * Mas levá-lo para dentro de uma das gavetas seria pior: o formulário
   * é um só, e um botão dentro da primeira gaveta salvaria também a
   * segunda sem dizer isso a ninguém.
   *
   * Então ele aparece quando as listas deixam de ser o que está salvo, e
   * some de novo depois de salvar. Quem compara é o estado, não um
   * evento de digitação: evento se perde -- um clique em "Adicionar",
   * um campo preenchido pelo navegador -- e um botão que não aparece é
   * um dono que não consegue salvar.
   */
  const comoEstaSalvo = (contatos: ContatoIgnorado[]) =>
    contatos.map((c) => `${formatPhone(c.numero)}~${c.nome ?? ""}~${c.avisar}`).join("|");
  const comoEsta = (linhas: Linha[]) =>
    linhas
      .filter((l) => l.numero.trim())
      .map((l) => `${l.numero.trim()}~${l.nome.trim()}~${l.avisar}`)
      .join("|");
  const mexeu = comoEsta(linhasIgnorados) !== comoEstaSalvo(ignorados);

  // Só a lista de quem a IA não responde.
  //
  // A lista de "números de teste" morava aqui ao lado e saiu em
  // 24/11/2026, a pedido dele: servia para ele conversar dos dois lados
  // enquanto testava, e com a Lia já atendendo cliente de verdade virou
  // uma gaveta que ninguém abre.
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="restaurantId" value={restaurantId} />

      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}

      <Gaveta
        titulo="Quem a IA não responde"
        resumo={quantos(linhasIgnorados, "a IA responde todo mundo")}
        icone={<UserX />}
      >
        <Lista
          campo="ignorado"
          titulo="Quem a IA não responde"
          explicacao="Sua família, seus amigos, os fornecedores. A IA nunca responde esses números. Marque o aviso nos que você não quer perder, como a padaria."
          vazia="Ninguém na lista."
          linhas={linhasIgnorados}
          setLinhas={setIgnorados}
        />
      </Gaveta>

      {mexeu && (
        <SubmitButton size="sm" className="self-start" pendingText="Salvando...">
          Salvar a lista
        </SubmitButton>
      )}
    </form>
  );
}

/** "3 números" na gaveta fechada, ou o que dizer quando não há nenhum */
function quantos(linhas: Linha[], vazio: string) {
  const n = linhas.filter((l) => l.numero.trim()).length;
  return n === 0 ? vazio : n === 1 ? "1 número" : `${n} números`;
}
