"use client";

import { useActionState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";

import { esquecerConversas, iaAnotaPedidos, iaNoChatDoCardapio, type EstadoDaAcao } from "./actions";

// As chaves que o dono mexe sozinho. Cada uma é um formulário próprio:
// são decisões separadas, e uma não espera a outra.

/** o que toda chave daqui desenha: título, estado, explicação e um botão */
function Chave({
  titulo,
  marca,
  texto,
  estado,
  acao,
  campos,
  botao,
  variante = "secondary",
}: {
  titulo: string;
  marca?: React.ReactNode;
  texto: string;
  estado: EstadoDaAcao;
  acao: (formData: FormData) => void;
  campos: React.ReactNode;
  botao: string;
  variante?: "primary" | "secondary";
}) {
  return (
    <>
      <p className="flex flex-wrap items-center gap-2 font-extrabold">
        {titulo}
        {marca}
      </p>
      <p className="text-sm text-muted">{texto}</p>
      {estado.error && <Alert tone="danger">{estado.error}</Alert>}
      {estado.message && !estado.error && <Alert tone="success">{estado.message}</Alert>}
      <form action={acao} className="flex items-start">
        {campos}
        <SubmitButton variant={variante} size="sm">
          {botao}
        </SubmitButton>
      </form>
    </>
  );
}

/** a IA pode anotar pedido pela conversa */
export function Pedidos({ restaurantId, ligado }: { restaurantId: string; ligado: boolean }) {
  const [estado, acao] = useActionState<EstadoDaAcao, FormData>(iaAnotaPedidos, {});

  return (
    <Chave
      titulo="Anotar pedidos"
      marca={ligado ? <Badge tone="success">Ligado</Badge> : <Badge>Só tira dúvidas</Badge>}
      texto={
        ligado
          ? 'Ela manda o link primeiro, sempre. Se o cliente não conseguir pedir por ele, aí sim anota pela conversa, lê o resumo com o total e só cria o pedido depois do "sim" — ele chega em Pedidos com o selo "Feito pela IA". Também manda o Pix de pedido em aberto e pede o comprovante, mas quem confirma o pagamento é você (ou o Mercado Pago).'
          : "Hoje ela tira dúvidas sobre o cardápio, horário, entrega e pagamento, e manda o link para o cliente pedir. Ligando, ela também anota o pedido de quem não conseguir pelo link."
      }
      estado={estado}
      acao={acao}
      campos={
        <>
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input type="hidden" name="ligar" value={ligado ? "0" : "1"} />
        </>
      }
      botao={ligado ? "Desligar os pedidos pela IA" : "Deixar ela anotar pedidos"}
      variante={ligado ? "secondary" : "primary"}
    />
  );
}

/** o atendente dentro do cardápio, sem WhatsApp no meio */
export function NoCardapio({ restaurantId, ligado }: { restaurantId: string; ligado: boolean }) {
  const [estado, acao] = useActionState<EstadoDaAcao, FormData>(iaNoChatDoCardapio, {});

  return (
    <Chave
      titulo="Atender no cardápio"
      marca={ligado ? <Badge tone="success">Ligado</Badge> : <Badge>Desligado</Badge>}
      texto={
        ligado
          ? 'Quem abre o link do restaurante vê o botão "Tirar dúvida" e conversa ali mesmo. Ela responde sobre o cardápio, a entrega e o pagamento, e manda a pessoa fechar o pedido pelo próprio cardápio. Só responde com o restaurante aberto.'
          : 'Ligando, aparece um botão "Tirar dúvida" no seu cardápio e ela responde ali mesmo. Não precisa de WhatsApp conectado.'
      }
      estado={estado}
      acao={acao}
      campos={
        <>
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input type="hidden" name="ligar" value={ligado ? "0" : "1"} />
        </>
      }
      botao={ligado ? "Desligar no cardápio" : "Ligar no cardápio"}
      variante={ligado ? "secondary" : "primary"}
    />
  );
}

/** apaga o que ela lembra das conversas */
export function Esquecer({ restaurantId }: { restaurantId: string }) {
  const [estado, acao] = useActionState<EstadoDaAcao, FormData>(esquecerConversas, {});

  return (
    <Chave
      titulo="Recomeçar as conversas"
      texto="Apaga o que a IA lembra das conversas. Os seus pedidos, os clientes e as mensagens no WhatsApp não são tocados. Use quando ela estiver repetindo uma resposta antiga, ou quando ficou quieta com alguém depois que você respondeu pelo celular."
      estado={estado}
      acao={acao}
      campos={<input type="hidden" name="restaurantId" value={restaurantId} />}
      botao="Apagar o que ela lembra"
    />
  );
}
