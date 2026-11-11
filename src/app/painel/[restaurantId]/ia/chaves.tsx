"use client";

import { useActionState } from "react";

import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { SwitchButton } from "@/components/ui/switch-button";

import { esquecerConversas, iaAnotaPedidos, iaNoChatDoCardapio, type EstadoDaAcao } from "./actions";

// As chaves que o dono mexe sozinho. Cada uma é um formulário próprio:
// são decisões separadas, e uma não espera a outra.

/**
 * Uma chave de ligar e desligar: título, interruptor e a explicação.
 *
 * Interruptor e não botão. O botão dizia a ação ("Desligar no cardápio") e
 * o estado vinha numa etiqueta ao lado -- duas leituras para responder
 * "está ligado?". O interruptor responde isso na posição, que é como o
 * resto do painel já funciona (os recursos, as permissões do garçom).
 *
 * O rótulo repete o título de propósito: é o que o leitor de tela anuncia
 * junto do "ligado/desligado", e sem ele a chave seria "ligado" sozinho.
 */
function Chave({
  titulo,
  texto,
  estado,
  acao,
  restaurantId,
  ligado,
}: {
  titulo: string;
  texto: string;
  estado: EstadoDaAcao;
  acao: (formData: FormData) => void;
  restaurantId: string;
  ligado: boolean;
}) {
  return (
    <>
      <form action={acao} className="flex items-start">
        <input type="hidden" name="restaurantId" value={restaurantId} />
        {/* o valor é o contrário do estado de agora: o toque inverte */}
        <input type="hidden" name="ligar" value={ligado ? "0" : "1"} />
        <SwitchButton checked={ligado} label={titulo} className="font-extrabold" />
      </form>
      <p className="text-sm text-muted">{texto}</p>
      {estado.error && <Alert tone="danger">{estado.error}</Alert>}
      {estado.message && !estado.error && <Alert tone="success">{estado.message}</Alert>}
    </>
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
      texto={
        ligado
          ? 'Ela manda o link primeiro, sempre. Se o cliente não conseguir pedir por ele, aí sim anota pela conversa, lê o resumo com o total e só cria o pedido depois do "sim" — ele chega em Pedidos com o selo "Feito pela IA". Também manda o Pix de pedido em aberto e pede o comprovante, mas quem confirma o pagamento é você (ou o Mercado Pago).'
          : "Hoje ela tira dúvidas sobre o cardápio, horário, entrega e pagamento, e manda o link para o cliente pedir. Ligando, ela também anota o pedido de quem não conseguir pelo link."
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
      texto={
        ligado
          ? 'Quem abre o link do restaurante vê o botão "Tirar dúvida" e conversa ali mesmo. Ela responde sobre o cardápio, a entrega e o pagamento, e manda a pessoa fechar o pedido pelo próprio cardápio. Só responde com o restaurante aberto.'
          : 'Ligando, aparece um botão "Tirar dúvida" no seu cardápio e ela responde ali mesmo. Não precisa de WhatsApp conectado.'
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
    <>
      <p className="font-extrabold">Recomeçar as conversas</p>
      <p className="text-sm text-muted">
        Apaga o que a IA lembra das conversas. Os seus pedidos, os clientes e as mensagens no
        WhatsApp não são tocados. Use quando ela estiver repetindo uma resposta antiga, ou quando
        ficou quieta com alguém depois que você respondeu pelo celular.
      </p>
      {estado.error && <Alert tone="danger">{estado.error}</Alert>}
      {estado.message && !estado.error && <Alert tone="success">{estado.message}</Alert>}
      <form action={acao} className="flex items-start">
        <input type="hidden" name="restaurantId" value={restaurantId} />
        <SubmitButton variant="secondary" size="sm">
          Apagar o que ela lembra
        </SubmitButton>
      </form>
    </>
  );
}
