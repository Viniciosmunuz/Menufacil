"use client";

import { Pencil, Trash2 } from "lucide-react";
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
// Dá para editar, e não só criar e apagar: o primeiro cadastro quase
// nunca sai certo. O Rocha entrou como "mercado" e é adega -- apagar e
// digitar tudo de novo para trocar uma palavra é o tipo de coisa que faz
// o dono deixar errado.
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

const VAZIO: EnderecoConhecido = {
  nome: "",
  apelidos: [],
  rua: "",
  numero: "",
  bairro: "",
  referencia: "",
  complemento: null,
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
  // `null` é o formulário fechado; um objeto é o que está sendo escrito
  const [editando, setEditando] = useState<EnderecoConhecido | null>(
    enderecos.length === 0 ? VAZIO : null,
  );
  // o nome com que ele chegou: se mudar, o antigo sai da lista
  const [original, setOriginal] = useState("");

  function abrir(e: EnderecoConhecido, nomeOriginal: string) {
    setEditando(e);
    setOriginal(nomeOriginal);
  }

  return (
    <div className="flex flex-col gap-4">
      {enderecos.length > 0 && (
        <ul className="flex flex-col gap-2">
          {enderecos.map((e) => (
            <li
              key={e.nome}
              className="flex items-start justify-between gap-2 rounded-lg border border-line bg-surface-2 p-3"
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
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => abrir(e, e.nome)}
                  aria-label={`Editar ${e.nome}`}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </Button>
                <form action={apagar}>
                  <input type="hidden" name="restaurantId" value={restaurantId} />
                  <input type="hidden" name="nome" value={e.nome} />
                  <SubmitButton
                    variant="ghost"
                    size="sm"
                    pendingText="..."
                    aria-label={`Tirar ${e.nome} da lista`}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </SubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {apagado.message && <Alert tone="success">{apagado.message}</Alert>}
      {apagado.error && <Alert tone="danger">{apagado.error}</Alert>}

      {editando ? (
        <form
          action={salvar}
          /* a chave remonta os campos ao trocar de lugar: sem ela, o
             formulário guardaria o que estava escrito no anterior */
          key={original || "novo"}
          className="flex flex-col gap-3 rounded-lg border border-line p-3"
        >
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input type="hidden" name="nomeOriginal" value={original} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Como o cliente chama" htmlFor="endereco-nome">
              <Input
                id="endereco-nome"
                name="nome"
                required
                defaultValue={editando.nome}
                placeholder="Moura"
              />
            </Field>
            <Field label="Outros nomes (separados por vírgula)" htmlFor="endereco-apelidos">
              <Input
                id="endereco-apelidos"
                name="apelidos"
                defaultValue={editando.apelidos.join(", ")}
                placeholder="casa do Moura, seu Moura"
              />
            </Field>
            <Field label="Rua" htmlFor="endereco-rua">
              <Input
                id="endereco-rua"
                name="rua"
                required
                defaultValue={editando.rua}
                placeholder="Av. Sucupira"
              />
            </Field>
            <Field label="Número" htmlFor="endereco-numero">
              <Input
                id="endereco-numero"
                name="numero"
                defaultValue={editando.numero}
                placeholder="s/n"
              />
            </Field>
            <Field label="Bairro" htmlFor="endereco-bairro">
              <Input
                id="endereco-bairro"
                name="bairro"
                required
                defaultValue={editando.bairro}
                placeholder="Morada do Sol"
              />
            </Field>
            <Field label="Complemento" htmlFor="endereco-complemento">
              <Input
                id="endereco-complemento"
                name="complemento"
                defaultValue={editando.complemento ?? ""}
                placeholder="casa dos fundos"
              />
            </Field>
          </div>
          <Field label="Ponto de referência" htmlFor="endereco-referencia">
            <Input
              id="endereco-referencia"
              name="referencia"
              required
              defaultValue={editando.referencia}
              placeholder="adega do Rocha, em frente ao Papaléguas"
            />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton size="sm" pendingText="Salvando...">
              {original ? "Salvar alterações" : "Salvar lugar"}
            </SubmitButton>
            {enderecos.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
            )}
          </div>
          {estado.error && <Alert tone="danger">{estado.error}</Alert>}
          {estado.message && !estado.error && <Alert tone="success">{estado.message}</Alert>}
        </form>
      ) : (
        <Button variant="outline" size="sm" onClick={() => abrir(VAZIO, "")}>
          Adicionar lugar
        </Button>
      )}
    </div>
  );
}
