"use client";

import { CircleCheck } from "lucide-react";
import { Fragment, useActionState, useEffect, useRef, type ReactNode } from "react";

import { Alert } from "@/components/ui/alert";
import { Gaveta } from "@/components/ui/gaveta";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatTime } from "@/lib/format";

export type SectionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
  savedAt?: number;
};

// Um bloco de configuração com o próprio botão "Salvar", dentro de uma
// gaveta.
//
// Até 16/11/2026 eram nove cartões abertos, empilhados: a tela do
// restaurante tinha quase sete mil pixels de altura e exigia uma fita de
// atalhos grudada no alto só para andar nela. Para saber a taxa de
// entrega era preciso rolar até o meio da página.
//
// Agora cada bloco é uma linha que diz, fechada, o que está valendo ali
// dentro -- "Entrega R$ 3,00 · 30 a 50 min". A tela inteira cabe numa
// tela, e lê-la de cima a baixo responde quase tudo sem abrir nada.
// Abrir é só para mudar.

export function SectionForm({
  id,
  title,
  resumo,
  description,
  icone,
  action,
  restaurantId,
  submitLabel = "Salvar",
  children,
}: {
  id?: string;
  title: string;
  /** o que está valendo aqui dentro, lido com a gaveta fechada */
  resumo?: string;
  description?: ReactNode;
  /** o ícone ao lado do título: ajuda a achar a seção passando o olho */
  icone?: ReactNode;
  action: (state: SectionState, formData: FormData) => Promise<SectionState>;
  restaurantId: string;
  submitLabel?: string;
  children: (state: SectionState) => ReactNode;
}) {
  const [state, formAction] = useActionState(action, {});
  // Depois de enviar, o React reseta o formulário para os valores "padrão"
  // de quando os campos apareceram (um <select> voltaria para "Escolha").
  // Recriar os campos a cada resposta faz o padrão ser o valor atual.
  const fieldsKey = state.savedAt ?? JSON.stringify(state.values ?? null);

  const gaveta = useRef<HTMLDetailsElement>(null);

  /**
   * Abre sozinha quando se chega por um link de âncora.
   *
   * O cartão de pendências do painel manda para `restaurante#pagamento`,
   * `#horarios`, `#contato`. Com as seções em gaveta, esses links
   * parariam numa linha fechada: a pessoa clicou em "falta a chave Pix"
   * e teria de descobrir que ainda precisa abrir a gaveta. CSS não
   * resolve -- não existe seletor que abra um `<details>` --, e trocar a
   * prop `aberta` também não: depois de montado, quem manda no atributo
   * `open` é o navegador, não o React. Por isso a gaveta é aberta aqui,
   * direto no elemento.
   */
  useEffect(() => {
    if (!id) return;
    const conferir = () => {
      if (window.location.hash !== `#${id}` || !gaveta.current) return;
      gaveta.current.open = true;
      // o scroll vem no quadro seguinte: antes disso a gaveta ainda está
      // fechada e o navegador pararia na altura errada
      requestAnimationFrame(() => gaveta.current?.scrollIntoView({ block: "start" }));
    };
    conferir();
    window.addEventListener("hashchange", conferir);
    return () => window.removeEventListener("hashchange", conferir);
  }, [id]);

  /**
   * Erro que voltou do servidor abre a gaveta.
   *
   * Sem isto, salvar com um campo inválido deixaria a mensagem vermelha
   * dentro de uma gaveta fechada: a tela não mudaria nada e a pessoa não
   * saberia por que não salvou.
   */
  const comErro = Boolean(state.error || state.fieldErrors);
  useEffect(() => {
    if (comErro && gaveta.current) gaveta.current.open = true;
  }, [comErro, state.savedAt]);

  return (
    // scroll-mt: a faixa do alto do painel fica grudada, e sem a folga o
    // título da gaveta pararia escondido atrás dela
    <Gaveta
      id={id}
      ref={gaveta}
      titulo={title}
      resumo={resumo}
      icone={icone}
      className="scroll-mt-24"
      selo={
        state.ok && state.savedAt ? (
          <span className="flex shrink-0 items-center gap-1.5 text-sm font-bold text-success" role="status">
            <CircleCheck className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Salvo às {formatTime(new Date(state.savedAt))}</span>
          </span>
        ) : undefined
      }
    >
      {description && <p className="-mt-1 text-sm text-muted">{description}</p>}
      <form action={formAction} className="flex flex-col gap-5">
        <input type="hidden" name="restaurantId" value={restaurantId} />
        {state.error && <Alert tone="danger">{state.error}</Alert>}
        {state.fieldErrors && !state.error && (
          <Alert tone="danger">Confira os campos marcados em vermelho.</Alert>
        )}
        <Fragment key={fieldsKey}>{children(state)}</Fragment>
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <SubmitButton>{submitLabel}</SubmitButton>
        </div>
      </form>
    </Gaveta>
  );
}
