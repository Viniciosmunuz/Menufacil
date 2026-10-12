"use client";

import { Pencil, UserMinus, X } from "lucide-react";
import { useActionState, useState } from "react";

import { editarGarcom, tirarGarcomDaEquipe, type SalaoFormState } from "@/app/painel/[restaurantId]/salao/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/ui/submit-button";

// O que um garçom pode fazer, mudado pelo lápis da linha dele.
//
// Lançar pedido e receber pagamento todo garçom faz -- é o trabalho. As
// duas permissões daqui são as que mexem no que já aconteceu: apagar da
// conta um prato que a cozinha fez, e liberar a mesa. Nascem desligadas e o
// dono liga para quem ele confia, a qualquer momento: confiança muda com o
// tempo, e refazer o cadastro para isso perderia o histórico de quem
// atendeu qual mesa.
//
// Tirar da equipe fica aqui dentro, e não como um segundo ícone na linha:
// são dois gestos para a mesma pessoa, e um X ao lado do lápis, num celular
// no meio do movimento, é longe demais de "nunca mais lança pedido".

export function PermissoesDoGarcom({
  restaurantId,
  vinculoId,
  nome,
  podeExcluirItem,
  podeFinalizarMesa,
}: {
  restaurantId: string;
  vinculoId: string;
  nome: string | null;
  podeExcluirItem: boolean;
  podeFinalizarMesa: boolean;
}) {
  const [abrindo, setAbrindo] = useState(false);
  const [tirando, setTirando] = useState(false);
  const [estado, salvar] = useActionState<SalaoFormState, FormData>(editarGarcom, {});
  const [saida, tirar] = useActionState<SalaoFormState, FormData>(tirarGarcomDaEquipe, {});

  // salvou: o painel fecha e a linha volta a mostrar as permissões novas,
  // porque a ação revalida a página
  const [ultimo, setUltimo] = useState<string | undefined>(undefined);
  if (estado.ok && estado.message !== ultimo) {
    setUltimo(estado.message);
    setAbrindo(false);
  }

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
      <form action={salvar} className="flex flex-col gap-3">
        <input type="hidden" name="restaurantId" value={restaurantId} />
        <input type="hidden" name="vinculoId" value={vinculoId} />

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

        <Checkbox
          name="podeExcluirItem"
          defaultChecked={podeExcluirItem}
          label="Apagar item da comanda"
          hint="Item já enviado para a cozinha."
        />
        <Checkbox
          name="podeFinalizarMesa"
          defaultChecked={podeFinalizarMesa}
          label="Finalizar a mesa"
          hint="Liberar a mesa, dar desconto e desfazer um recebimento."
        />

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
