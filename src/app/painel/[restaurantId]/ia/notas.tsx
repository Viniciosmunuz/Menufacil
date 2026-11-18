"use client";

import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

import { salvarNotasDaIa, type EstadoDaAcao } from "./actions";

const TETO = 2000;

// O que só quem é da cidade sabe.
//
// A lista de bairros e o cardápio dizem o que o restaurante vende e até
// onde a moto vai, mas não dizem como a cidade fala. "Entrega aqui no
// Moura" não é bairro nem rua: é o lugar que todo mundo ali conhece, e a
// Lia recusava uma entrega que o Papaléguas faz toda semana.
//
// Campo livre de propósito. Qualquer formulário que eu desenhasse erraria
// no caso seguinte -- hoje é o apelido de um lugar, amanhã é um cliente
// antigo que só dá o sobrenome, depois é o combinado com o vizinho. Quem
// conhece a clientela é o dono, e ele escreve do jeito dele.
//
// O placeholder faz o trabalho que um parágrafo de explicação faria: ele
// olha, vê um exemplo com cara de coisa real e entende o campo sem ler
// nada. É a mesma escolha do resto da tela.

export function NotasDaIa({
  restaurantId,
  notas,
}: {
  restaurantId: string;
  notas: string;
}) {
  const [estado, acao] = useActionState<EstadoDaAcao, FormData>(salvarNotasDaIa, {});
  const [texto, setTexto] = useState(notas);

  const sobrando = TETO - texto.length;

  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <Textarea
        id="notas-da-ia"
        name="notas"
        rows={6}
        maxLength={TETO}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={
          'Quando falarem "no Moura", é a casa do Vinícios, na rua do campo, bairro Centro.\n' +
          "O posto do Zé fica na entrada do Galo, pela BR.\n" +
          "A dona Célia sempre pede a pizza sem cebola."
        }
      />
      <div className="flex items-center gap-4">
        <SubmitButton size="sm" pendingText="Salvando...">
          Salvar
        </SubmitButton>
        {/* o contador só aparece quando o fim está perto: antes disso é ruído */}
        {sobrando <= 300 && (
          <span className="text-sm text-faint">
            {sobrando === 0 ? "Acabou o espaço" : `${sobrando} caracteres`}
          </span>
        )}
      </div>
      {estado.error && <Alert tone="danger">{estado.error}</Alert>}
      {estado.message && !estado.error && <Alert tone="success">{estado.message}</Alert>}
    </form>
  );
}
