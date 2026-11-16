import { Bell, ChevronRight, Download, LogOut, Printer, Repeat, SlidersHorizontal, Store, Truck, Users, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/panel/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Gaveta } from "@/components/ui/gaveta";
import { APP_SETUP_PATH, APP_VERSION } from "@/lib/app-release";
import { noAr } from "@/lib/features";
import { logout } from "@/server/auth/actions";
import { requireDono } from "@/server/auth/dal";
import { prontoParaCobrar } from "@/server/pagamentos/conta";

import { ModoForm } from "../entrega/forms";

export const metadata: Metadata = { title: "Ajustes" };

// Configurações: um índice, e não uma tela nova de ajustes.
//
// Cada ajuste do restaurante já tem a sua tela -- o endereço em Meu
// restaurante, a impressora no Menu Fácil PC, o garçom na configuração do
// salão. O que faltava era um lugar só para achar todos: quem procura
// "onde eu mudo a taxa de entrega" não sabe que a resposta é "Meu
// restaurante". Aqui nada é salvo; cada linha leva à tela que já existia.
//
// Só aparece o que este restaurante tem. Um recurso que o admin não
// liberou não vira uma linha apagada: simplesmente não está na lista.

/**
 * Uma linha do índice.
 *
 * O `resumo` é opcional desde 16/11/2026, e quase sempre fica de fora.
 * Toda linha tinha uma: "Contato — WhatsApp, telefone, e-mail e
 * Instagram", "Endereço — Onde o cliente retira o pedido". Dizer de novo
 * o que o nome já diz dobra a altura da lista e ensina o olho a pular a
 * segunda linha -- e aí ele pula também as poucas que precisavam ser
 * lidas.
 *
 * Sobraram as que avisam o que o nome não entrega: que o ajuste mora em
 * outra tela ("Fica na tela de Pedidos") ou o que a palavra significa
 * aqui dentro ("Totem", "Mercado Pago").
 */
type Atalho = { href: string; nome: string; resumo?: string };

type Categoria = { titulo: string; icone: ReactNode; atalhos: Atalho[] };

export default async function ConfiguracoesPage({ params }: PageProps<"/painel/[restaurantId]/configuracoes">) {
  const { restaurantId } = await params;
  const { restaurant, user } = await requireDono(restaurantId);

  const base = `/painel/${restaurant.id}`;
  const dados = `${base}/restaurante`;
  const salao = noAr("salaoEnabled") && restaurant.salaoEnabled;
  const entregadores = noAr("entregadorEnabled") && restaurant.entregadorEnabled;
  const ia = noAr("iaEnabled") && restaurant.iaEnabled;
  // dá para ligar o 100% Delivery? Quem já colou o Access Token no Totem
  // também pode: é a conta dele do mesmo jeito
  const contaPronta = restaurant.fullDeliveryEnabled ? await prontoParaCobrar(restaurant.id) : false;

  const categorias: Categoria[] = [
    {
      titulo: "Dados do restaurante",
      icone: <Store />,
      atalhos: [
        { href: `${dados}#informacoes`, nome: "Nome, descrição e fotos" },
        { href: `${dados}#contato`, nome: "Contato" },
        { href: `${dados}#endereco`, nome: "Endereço" },
      ],
    },
    {
      titulo: "Delivery e entrega",
      icone: <Truck />,
      atalhos: [
        { href: `${dados}#horarios`, nome: "Horários de funcionamento" },
        { href: `${dados}#entrega`, nome: "Entrega e retirada" },
        { href: `${dados}#area`, nome: "Bairros atendidos" },
        ...(entregadores ? [{ href: `${base}/entregadores`, nome: "Entregadores" }] : []),
      ],
    },
    {
      titulo: "Impressão e equipamentos",
      icone: <Printer />,
      atalhos: [
        { href: `${base}/pedidos`, nome: "Impressão dos pedidos", resumo: "Fica na tela de Pedidos." },
        ...(salao ? [{ href: `${base}/salao/configuracao`, nome: "Impressão do salão", resumo: "A impressora de cada seção do cardápio." }] : []),
        ...(restaurant.totemEnabled ? [{ href: `${base}/totem`, nome: "Totem", resumo: "O autoatendimento e a maquininha." }] : []),
      ],
    },
    {
      titulo: "Equipe e acessos",
      icone: <Users />,
      atalhos: [
        ...(salao ? [{ href: `${base}/salao/configuracao`, nome: "Garçons" }] : []),
        ...(entregadores ? [{ href: `${base}/entregadores`, nome: "Contas dos entregadores" }] : []),
        { href: `${base}/perfil`, nome: "Minha senha" },
      ],
    },
    {
      titulo: "Notificações",
      icone: <Bell />,
      atalhos: [
        { href: `${base}/pedidos`, nome: "Som e avisos de pedido novo", resumo: "Fica na tela de Pedidos." },
      ],
    },
    {
      titulo: "Pagamentos",
      icone: <Wallet />,
      atalhos: [
        { href: `${dados}#pagamento`, nome: "Chave Pix" },
        { href: `${dados}#formas-de-pagamento`, nome: "Cartão e dinheiro" },
        ...(restaurant.fullDeliveryEnabled
          ? [{ href: `${base}/entrega`, nome: "Mercado Pago", resumo: "A conta que recebe o Pix pago na hora do pedido." }]
          : []),
      ],
    },
    {
      titulo: "Preferências",
      icone: <SlidersHorizontal />,
      atalhos: [
        { href: `${dados}#pizza`, nome: "Pizza de mais de um sabor" },
        ...(ia ? [{ href: `${base}/ia`, nome: "WhatsApp IA", resumo: "O que a Lia faz quando atende os seus clientes." }] : []),
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Ajustes" />

      {/* O Menu Fácil PC, em destaque. Era um ícone solto ao lado do Sair,
          que ninguém sabia o que baixava; aqui ele tem nome, o ícone do
          aplicativo e o botão. O admin pode ter desligado o recurso. */}
      {restaurant.printEnabled && (
        <Card className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
          <Image src="/icone-192.png" alt="" width={56} height={56} className="size-14 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1 basis-56">
            <h2 className="font-extrabold">Menu Fácil PC</h2>
            <p className="text-sm text-muted">
              O programa do computador do balcão: imprime o pedido sozinho e toca o sino. Windows · versão {APP_VERSION}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href={APP_SETUP_PATH} download className={buttonClasses("primary", "md")}>
              <Download className="size-4" aria-hidden="true" />
              Baixar
            </a>
            <Link href={`${base}/menu-facil-pc`} className={buttonClasses("secondary", "md")}>
              Parear o computador
            </Link>
          </div>
        </Card>
      )}

      {/* Duas colunas que se encaixam: cada cartão tem a altura do que
          contém, e numa grade comum o mais curto deixava um buraco ao lado
          do mais alto. Em colunas, o de baixo sobe e encosta. */}
      {/* Os dois modos de receber pedido, numa gaveta: é decisão de uma
          vez, que não precisa ficar aberta na frente de ninguém. Veio da
          tela de Pagamentos em 15/11/2026, a pedido dele. */}
      {restaurant.fullDeliveryEnabled && (
        <Gaveta
          titulo="Modos"
          resumo={restaurant.deliveryMode === "FULL_DELIVERY" ? "100% Delivery" : "Pedido pelo WhatsApp"}
          icone={<Repeat />}
          selo={<Badge tone="success">Em uso</Badge>}
        >
          <ModoForm restaurantId={restaurant.id} modo={restaurant.deliveryMode} contaPronta={contaPronta} />
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <p className="font-extrabold">No 100% Delivery, o caminho do cliente</p>
            <ol className="flex flex-col gap-3 text-sm">
              {[
                ["Monta o pedido", "No mesmo cardápio de sempre, pelo seu link."],
                ["Escolhe entrega ou retirada", "Entrega pede o endereço; retirada não pede nada disso."],
                ["Paga por Pix", "QR e copia e cola na tela. O valor vai para a sua conta do Mercado Pago."],
                ["O pedido aparece aqui", "Só depois de o Mercado Pago confirmar. Aí a comanda sai e o sino toca."],
                ["Acompanha cada passo", "A tela dele muda sozinha: recebido, em preparo, pronto, saiu para entrega."],
                ["Conversa com você", "Pela mesma tela, amarrada ao pedido dele. Você responde na aba Pedidos."],
              ].map(([titulo, texto], i) => (
                <li key={titulo} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-extrabold text-brand">
                    {i + 1}
                  </span>
                  <span>
                    <strong className="block">{titulo}</strong>
                    <span className="text-muted">{texto}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="rounded-control bg-surface-2 p-3 text-sm text-muted">
              Cartão e dinheiro continuam valendo, do jeito que estão em <strong className="text-ink">Restaurante</strong>:
              quem escolher uma dessas paga na entrega ou na retirada, como sempre.
            </p>
          </div>
        </Gaveta>
      )}

      <div className="gap-4 lg:columns-2">
        {categorias.map((c) => (
          // O ícone do grupo perdeu o quadrado laranja em 16/11/2026.
          // Eram seis blocos de cor numa tela em que o laranja é do que
          // se toca -- os botões, a aba aberta --, e aqui ele não marcava
          // nada: marcava todos. Cinza e sem fundo, o título volta a ser
          // o que se lê primeiro.
          <Card key={c.titulo} className="mb-4 flex break-inside-avoid flex-col gap-2 p-4 sm:p-5">
            <div className="flex items-center gap-2.5">
              <span className="shrink-0 text-faint [&_svg]:size-4">{c.icone}</span>
              <h2 className="text-sm font-extrabold tracking-wide text-muted uppercase">{c.titulo}</h2>
            </div>

            <ul className="-mx-2 flex flex-col">
              {c.atalhos.map((a) => (
                <li key={a.nome}>
                  <Link
                    href={a.href}
                    className="flex min-h-11 items-center gap-3 rounded-control px-2 py-2 transition-colors hover:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{a.nome}</span>
                      {a.resumo && <span className="block text-sm text-muted">{a.resumo}</span>}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      {/* Sair fica aqui, e não no menu: é coisa de uma vez por dia, e no
          menu ele dividia espaço com o que se usa o tempo todo.
          Deixou de ser um cartão inteiro: é um pé de página, do tamanho
          da importância que tem. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <p className="truncate text-sm text-muted">Você entrou como {user.name}.</p>
        <form action={logout}>
          <button type="submit" className={buttonClasses("secondary", "sm")}>
            <LogOut className="size-4" aria-hidden="true" />
            Sair da conta
          </button>
        </form>
      </div>
    </div>
  );
}
