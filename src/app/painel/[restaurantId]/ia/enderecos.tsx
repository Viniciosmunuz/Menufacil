"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

import { apagarEnderecoConhecido, salvarEnderecoConhecido, type EstadoDaAcao } from "./actions";

// Os lugares que a cidade conhece pelo nome.
//
// A folha de notas ao lado é texto livre e continua sendo: ela serve para
// a Lia ENTENDER o que o cliente fala. Esta lista é outra coisa -- é o
// endereço pronto, e é o que faz o pedido FECHAR sem mais pergunta
// nenhuma. "Entrega aqui no Moura" vira rua, número, bairro e referência
// de uma vez.
//
// Sem texto explicativo embaixo dos campos, como no resto do painel: os
// placeholders mostram um exemplo com cara de coisa real, e quem olha
// entende o que é sem ler nada.

export type EnderecoConhecido = {
  nome: string;
  apelidos: string[];
  rua: string;
  numero: string;
  bairro: string;
  referencia: string;
  complemento: string | null;
};

export function EnderecosConhecidos({
  restaurantId,
  enderecos,
}: {
  restaurantId: string;
  enderecos: EnderecoConhecido[];
}) {
  const [estado, salvar] = useActionState<EstadoDaAcao, FormData>(salvarEnderecoConhecido, {});
  const [apagado, apagar] = useActionState<EstadoDaAcao, FormData>(apagarEnderecoConhecido, {});
  // o formulário só aparece quando ele vai usar: a lista é o que importa
  const [abrindo, setAbrindo] = useState(enderecos.length === 0);

  return (
    <div className="flex flex-col gap-4">
      {enderecos.length > 0 && (
        <ul className="flex flex-col gap-2">
          {enderecos.map((e) => (
            <li
              key={e.nome}
              className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface-2 p-3"
            >
              <div className="min-w-0">
                <p className="font-bold">
                  {e.nome}
                  {e.apelidos.length > 0 && (
                    <span className="font-normal text-muted"> · {e.apelidos.join(", ")}</span>
                  )}
                </p>
                <p className="text-sm text-muted">
                  {e.rua}, {e.numero}
                  {e.complemento ? ` (${e.complemento})` : ""} — {e.bairro}
                </p>
                <p className="text-sm text-faint">Ref.: {e.referencia}</p>
              </div>
              <form action={apagar}>
                <input type="hidden" name="restaurantId" value={restaurantId} />
                <input type="hidden" name="nome" value={e.nome} />
                <SubmitButton variant="ghost" size="sm" pendingText="..." aria-label={`Tirar ${e.nome} da lista`}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}

      {apagado.message && <Alert tone="success">{apagado.message}</Alert>}
      {apagado.error && <Alert tone="danger">{apagado.error}</Alert>}

      {abrindo ? (
        <form action={salvar} className="flex flex-col gap-3 rounded-lg border border-line p-3">
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Como o cliente chama" htmlFor="endereco-nome">
              <Input id="endereco-nome" name="nome" required placeholder="Moura" />
            </Field>
            <Field label="Outros nomes (separados por vírgula)" htmlFor="endereco-apelidos">
              <Input id="endereco-apelidos" name="apelidos" placeholder="casa do Moura, seu Moura" />
            </Field>
            <Field label="Rua" htmlFor="endereco-rua">
              <Input id="endereco-rua" name="rua" required placeholder="Rua do Campo" />
            </Field>
            <Field label="Número" htmlFor="endereco-numero">
              <Input id="endereco-numero" name="numero" placeholder="s/n" />
            </Field>
            <Field label="Bairro" htmlFor="endereco-bairro">
              <Input id="endereco-bairro" name="bairro" required placeholder="Centro" />
            </Field>
            <Field label="Complemento" htmlFor="endereco-complemento">
              <Input id="endereco-complemento" name="complemento" placeholder="casa dos fundos" />
            </Field>
          </div>
          <Field label="Ponto de referência" htmlFor="endereco-referencia">
            <Input
              id="endereco-referencia"
              name="referencia"
              required
              placeholder="casa do Moura, em frente ao campo"
            />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton size="sm" pendingText="Salvando...">
              Salvar lugar
            </SubmitButton>
            {enderecos.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setAbrindo(false)}>
                Fechar
              </Button>
            )}
          </div>
          {estado.error && <Alert tone="danger">{estado.error}</Alert>}
          {estado.message && !estado.error && <Alert tone="success">{estado.message}</Alert>}
        </form>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAbrindo(true)}>
          Adicionar lugar
        </Button>
      )}
    </div>
  );
}
