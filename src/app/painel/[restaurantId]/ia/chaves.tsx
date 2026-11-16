"use client";

import { Eraser } from "lucide-react";
import { useActionState } from "react";

import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { SwitchButton } from "@/components/ui/switch-button";

import { esquecerConversas, iaAnotaPedidos, iaNoChatDoCardapio, iaOferece, type EstadoDaAcao } from "./actions";

// As chaves que o dono mexe sozinho. Cada uma é um formulário próprio:
// são decisões separadas, e uma não espera a outra.
//
// Até 16/11/2026 cada chave era um cartão solto, com um parágrafo embaixo
// explicando o que ela fazia. Quatro cartões, quatro parágrafos, e a tela
// pedia leitura antes de qualquer toque. Agora são linhas de uma lista só:
// o nome à esquerda, o interruptor à direita, e uma linha curta dizendo o
// que muda. Ele pediu intuitivo, e intuitivo é olhar e saber usar -- não
// ler um texto embaixo de cada campo.

/**
 * Uma linha de chave: nome, uma linha de recado, e o interruptor.
 *
 * O interruptor fica à direita porque é para onde o polegar vai, e porque
 * alinhado em coluna ele deixa a lista inteira legível de relance: tudo o
 * que está verde está ligado.
 */
function Chave({
  titulo,
  recado,
  estado,
  acao,
  restaurantId,
  ligado,
}: {
  titulo: string;
  /** uma linha, não um parágrafo: o que muda quando a chave vira */
  recado: string;
  estado: EstadoDaAcao;
  acao: (formData: FormData) => void;
  restaurantId: string;
  ligado: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 px-5 py-4">
      <div className="flex items-center gap-4">
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold">{titulo}</span>
          <span className="block text-sm text-muted">{recado}</span>
        </span>
        <form action={acao} className="shrink-0">
          <input type="hidden" name="restaurantId" value={restaurantId} />
          {/* o valor é o contrário do estado de agora: o toque inverte */}
          <input type="hidden" name="ligar" value={ligado ? "0" : "1"} />
          <SwitchButton checked={ligado} label={titulo} rotuloOculto />
        </form>
      </div>
      {estado.error && <Alert tone="danger">{estado.error}</Alert>}
      {estado.message && !estado.error && <Alert tone="success">{estado.message}</Alert>}
    </div>
  );
}

/** a IA pode anotar pedido pela conversa */
export function Pedidos({ restaurantId, ligado }: { restaurantId: string; ligado: boolean }) {
  const [estado, acao] = useActionState<EstadoDaAcao, FormData>(iaAnotaPedidos, {});

  return (
    <Chave
      titulo="Anotar pedidos"
      restaurantId={restaurantId}
      ligado={ligado}
      recado={
        ligado
          ? "Anota pela conversa e manda o Pix. Quem confirma o pagamento é você."
          : "Hoje ela só tira dúvidas e manda o link do cardápio."
      }
      estado={estado}
      acao={acao}
    />
  );
}

/** a IA pode oferecer uma coisa antes de fechar o pedido */
export function Ofertas({ restaurantId, ligado }: { restaurantId: string; ligado: boolean }) {
  const [estado, acao] = useActionState<EstadoDaAcao, FormData>(iaOferece, {});

  return (
    <Chave
      titulo="Oferecer no pedido"
      restaurantId={restaurantId}
      ligado={ligado}
      recado={
        ligado
          ? "Uma pergunta por pedido: bebida, acompanhamento ou sobremesa."
          : 'Perguntar uma vez "e para beber?", como o garçom faz.'
      }
      estado={estado}
      acao={acao}
    />
  );
}

/** o atendente dentro do cardápio, sem WhatsApp no meio */
export function NoCardapio({ restaurantId, ligado }: { restaurantId: string; ligado: boolean }) {
  const [estado, acao] = useActionState<EstadoDaAcao, FormData>(iaNoChatDoCardapio, {});

  return (
    <Chave
      titulo="Atender no cardápio"
      restaurantId={restaurantId}
      ligado={ligado}
      recado={
        ligado
          ? 'O botão "Tirar dúvida" está no seu cardápio, com o restaurante aberto.'
          : "Responder quem abre o seu link, sem precisar de WhatsApp."
      }
      estado={estado}
      acao={acao}
    />
  );
}

/**
 * Apaga o que ela lembra das conversas.
 *
 * Esta continua um botão, e não uma chavinha: não é um estado que fica
 * ligado ou desligado, é uma coisa que acontece uma vez e não volta
 * atrás. Chave que apaga seria uma chave que o dono tenta desligar depois.
 */
export function Esquecer({ restaurantId }: { restaurantId: string }) {
  const [estado, acao] = useActionState<EstadoDaAcao, FormData>(esquecerConversas, {});

  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <p className="text-sm text-muted">
        Ela esquece as conversas e volta a atender todo mundo do zero. Os pedidos já feitos não são tocados.
      </p>
      <SubmitButton variant="secondary" size="sm" className="self-start" pendingText="Apagando...">
        <Eraser className="size-4" aria-hidden="true" />
        Apagar as conversas
      </SubmitButton>
      {estado.error && <Alert tone="danger">{estado.error}</Alert>}
      {estado.message && !estado.error && <Alert tone="success">{estado.message}</Alert>}
    </form>
  );
}
