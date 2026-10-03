"use client";

import { Bike, CircleCheck, MessageCircle } from "lucide-react";
import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";

import { desconectarMercadoPago, escolherModo, salvarSegredoDoWebhookDaConta, type EntregaState } from "./actions";

// Formulários da seção Entrega. Cada um salva sozinho e avisa na hora, do
// mesmo jeito que os blocos de "Meu restaurante" e do Totem.

type Acao = (state: EntregaState, formData: FormData) => Promise<EntregaState>;

function Recado({ state }: { state: EntregaState }) {
  if (state.error) return <Alert tone="danger">{state.error}</Alert>;
  if (state.ok && state.message) return <Alert tone="success">{state.message}</Alert>;
  if (state.ok && state.savedAt) {
    return (
      <span className="flex items-center gap-1.5 text-sm font-bold text-success" role="status">
        <CircleCheck className="size-4" aria-hidden="true" />
        Salvo às {formatTime(new Date(state.savedAt))}
      </span>
    );
  }
  return null;
}

function useEntregaForm(acao: Acao) {
  return useActionState<EntregaState, FormData>(acao, {});
}

/**
 * A escolha entre os dois jeitos de receber pedido.
 *
 * São duas caixas grandes, com o que muda para o cliente escrito dentro,
 * porque esta é a decisão mais pesada do painel: ela troca o caminho do
 * dinheiro. Nada é salvo ao marcar -- o dono marca, lê e confirma.
 */
export function ModoForm({
  restaurantId,
  modo,
  contaPronta,
}: {
  restaurantId: string;
  modo: "WHATSAPP" | "FULL_DELIVERY";
  contaPronta: boolean;
}) {
  const [state, action] = useEntregaForm(escolherModo);
  const [escolha, setEscolha] = useState(modo);

  const opcoes = [
    {
      valor: "WHATSAPP" as const,
      titulo: "Pedido pelo WhatsApp",
      Icone: MessageCircle,
      texto: "Como é hoje. O cliente monta o pedido no cardápio e termina na sua conversa do WhatsApp. O pagamento acontece fora do sistema.",
      itens: ["O pedido chega na sua conversa", "Pix na sua chave, comprovante por mensagem", "Cartão e dinheiro na entrega"],
    },
    {
      valor: "FULL_DELIVERY" as const,
      titulo: "100% Delivery",
      Icone: Bike,
      texto: "Tudo acontece aqui dentro. O cliente paga por Pix na hora, acompanha o pedido numa tela que se atualiza sozinha e fala com você por ela.",
      itens: [
        "Pix na sua conta do Mercado Pago, confirmado automaticamente",
        "O pedido só vira comanda depois de pago",
        "Cliente acompanha cada passo e conversa com o balcão",
      ],
    },
  ];

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="restaurantId" value={restaurantId} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2" role="radiogroup" aria-label="Como você recebe os pedidos">
        {opcoes.map((o) => {
          const marcada = escolha === o.valor;
          const bloqueada = o.valor === "FULL_DELIVERY" && !contaPronta;
          return (
            <label
              key={o.valor}
              className={cn(
                "flex cursor-pointer flex-col gap-2 rounded-card border p-4",
                bloqueada && "cursor-not-allowed opacity-60",
                marcada ? "border-brand bg-brand-soft" : "border-line bg-surface-2 hover:border-line-strong",
              )}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="modo"
                  value={o.valor}
                  checked={marcada}
                  disabled={bloqueada}
                  onChange={() => setEscolha(o.valor)}
                  className="size-4 shrink-0 accent-brand"
                />
                <o.Icone className="size-5 shrink-0 text-brand" aria-hidden="true" />
                <span className="font-extrabold">{o.titulo}</span>
                {modo === o.valor && <span className="ml-auto text-xs font-extrabold text-success uppercase">em uso</span>}
              </span>
              <span className="text-sm text-muted">{o.texto}</span>
              <ul className="flex flex-col gap-1 text-sm">
                {o.itens.map((i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" />
                    {i}
                  </li>
                ))}
              </ul>
              {bloqueada && <span className="text-sm font-bold text-warning">Conecte a conta do Mercado Pago aqui embaixo para liberar.</span>}
            </label>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingText="Salvando..." disabled={escolha === modo}>
          {escolha === modo ? "É assim que está" : escolha === "FULL_DELIVERY" ? "Ligar o 100% Delivery" : "Voltar para o WhatsApp"}
        </SubmitButton>
        <Recado state={state} />
      </div>
    </form>
  );
}

/** o botão que leva para o Mercado Pago; a ação redireciona, não devolve estado */
export function ConectarForm({
  restaurantId,
  acao,
  conectada,
}: {
  restaurantId: string;
  acao: (formData: FormData) => Promise<void>;
  conectada: boolean;
}) {
  return (
    <form action={acao}>
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <SubmitButton pendingText="Abrindo o Mercado Pago...">{conectada ? "Conectar outra conta" : "Conectar Mercado Pago"}</SubmitButton>
    </form>
  );
}

export function DesconectarForm({ restaurantId }: { restaurantId: string }) {
  const [state, action] = useEntregaForm(desconectarMercadoPago);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <div className="flex flex-wrap items-center gap-3">
        <ConfirmButton size="md" confirmText="Sim, desconectar" cancelText="Deixar como está">
          Desconectar a conta
        </ConfirmButton>
        <Recado state={state} />
      </div>
      <p className="text-sm text-muted">
        O MenuFácil para de falar com o Mercado Pago em nome deste restaurante, e o pedido volta a ser feito pelo WhatsApp. Os
        pagamentos que já entraram ficam na sua conta, como sempre estiveram.
      </p>
    </form>
  );
}

export function SegredoDoWebhookForm({ restaurantId, cadastrado }: { restaurantId: string; cadastrado: boolean }) {
  const [state, action] = useEntregaForm(salvarSegredoDoWebhookDaConta);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <Field
        label="Chave secreta da assinatura"
        htmlFor="segredo"
        hint={
          cadastrado
            ? "Já cadastrada. Para trocar, cole a nova. Ela fica criptografada e não volta a aparecer."
            : "No site do Mercado Pago, em Suas integrações → o seu aplicativo → Webhooks, aparece uma chave secreta ao criar a notificação. Cole ela aqui."
        }
      >
        <Input id="segredo" name="segredo" type="password" autoComplete="off" spellCheck={false} placeholder={cadastrado ? "Cole a chave nova" : "Cole a chave secreta"} />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingText="Salvando...">{cadastrado ? "Trocar chave" : "Salvar chave"}</SubmitButton>
        <Recado state={state} />
      </div>
    </form>
  );
}
