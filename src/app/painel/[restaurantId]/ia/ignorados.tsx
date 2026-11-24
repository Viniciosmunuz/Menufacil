"use client";

import { Plus, Trash2, UserX } from "lucide-react";
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

type Linha = { chave: string; numero: string };

/**
 * Uma linha de número.
 *
 * Fora do componente de cima e com memo, como no cadastro de bairros: sem
 * isso, uma tecla digitada redesenha as duas listas inteiras.
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
  mexer: (chave: string, valor: string) => void;
  tirar: (chave: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Input
        name={campo}
        type="tel"
        inputMode="tel"
        aria-label={rotulo}
        placeholder="(92) 99999-0000"
        maxLength={20}
        value={linha.numero}
        onChange={(e) => mexer(linha.chave, e.target.value)}
      />
      <button
        type="button"
        onClick={() => tirar(linha.chave)}
        aria-label={`Tirar ${linha.numero || rotulo} da lista`}
        className="grid size-11 shrink-0 place-items-center rounded-control border border-line text-faint transition-colors hover:border-danger hover:text-danger"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
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
    (chave: string, valor: string) =>
      setLinhas((l) =>
        l.map((x) => (x.chave === chave ? { ...x, numero: valor } : x)),
      ),
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
            { chave: `${campo}-${Date.now()}-${l.length}`, numero: "" },
          ])
        }
      >
        <Plus className="size-4" aria-hidden="true" />
        Adicionar número
      </Button>
    </div>
  );
}

const paraLinhas = (numeros: string[], prefixo: string) =>
  numeros.map((n, i) => ({ chave: `${prefixo}-${i}`, numero: formatPhone(n) }));

export function ListasDaIa({
  restaurantId,
  ignorados,
}: {
  restaurantId: string;
  ignorados: string[];
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
  const comoEstaSalvo = (numeros: string[]) => numeros.map((n) => formatPhone(n)).join("|");
  const comoEsta = (linhas: Linha[]) =>
    linhas.map((l) => l.numero.trim()).filter(Boolean).join("|");
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
          explicacao="Sua família, seus amigos, os fornecedores. A IA nunca responde esses números."
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
