import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireRestaurantAccess, requireUser } from "@/server/auth/dal";
import { salvarConta } from "@/server/pagamentos/conta";
import { lerState, trocarCodePorToken } from "@/server/pagamentos/oauth";
import { panelAudit } from "@/server/panel";

// A volta do Mercado Pago, depois de o dono autorizar a conta dele.
//
// É uma página, não uma rota de API, por dois motivos. O primeiro é de
// servidor: na Vercel cada rota de API vira uma função e o plano aceita 12 --
// páginas não gastam nenhuma. O segundo é melhor: quando alguma coisa dá
// errado, o dono vê uma tela explicando, em vez de um JSON.
//
// O endereço é um só para todos os restaurantes, porque o Mercado Pago exige
// que ele seja igual ao cadastrado no aplicativo, sem nada variável no meio.
// De qual restaurante é esta volta vem no "state", assinado -- e ainda assim
// a permissão é conferida de novo aqui, pelo caminho normal do painel.

export const metadata: Metadata = { title: "Conectando o Mercado Pago", robots: { index: false, follow: false } };

/** o que não dá nem para saber de qual restaurante é: tela própria, sem painel */
function Recado({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-6 px-4 py-10">
      <Logo />
      <Card className="flex flex-col items-center gap-3 text-center">
        <TriangleAlert className="size-10 text-warning" aria-hidden="true" />
        <h1 className="text-xl font-extrabold">{titulo}</h1>
        <p className="text-muted">{texto}</p>
        <Link href="/painel" className={buttonClasses("primary")}>
          Voltar ao painel
        </Link>
      </Card>
    </div>
  );
}

export default async function RetornoDoMercadoPago({ searchParams }: PageProps<"/painel/mercado-pago/retorno">) {
  await requireUser();
  const sp = await searchParams;

  const texto = (chave: string) => (typeof sp[chave] === "string" ? (sp[chave] as string) : "");
  const code = texto("code");
  const state = texto("state");
  // o Mercado Pago avisa a desistência pela própria URL
  const negado = texto("error");

  const dados = lerState(state);
  if (!dados) {
    return (
      <Recado
        titulo="Não consegui identificar esta volta"
        texto="A autorização do Mercado Pago vale por alguns minutos. Abra a seção Entrega do seu restaurante e toque em Conectar Mercado Pago de novo."
      />
    );
  }

  // a permissão é conferida aqui, pelo caminho de sempre: o state diz de
  // quem é a volta, mas quem decide se esta pessoa pode mexer neste
  // restaurante é a camada de acesso
  const access = await requireRestaurantAccess(dados.restaurantId);
  const destino = `/painel/${access.restaurant.id}/entrega`;

  if (!access.restaurant.fullDeliveryEnabled) redirect(destino);
  if (negado || !code) redirect(`${destino}?mp=negado`);

  const tokens = await trocarCodePorToken(code);
  if (!tokens.ok) {
    await panelAudit(access, "entrega.mercado_pago.falhou", { erro: tokens.erro.slice(0, 200) });
    redirect(`${destino}?mp=erro`);
  }

  const salva = await salvarConta(access.restaurant.id, tokens.tokens);
  if ("erro" in salva) redirect(`${destino}?mp=erro`);

  // o token nunca entra no histórico: só o fato de a conta ter sido ligada
  await panelAudit(access, "entrega.mercado_pago.conectada", {
    producao: tokens.tokens.liveMode,
    conta: tokens.tokens.mpUserId,
  });
  redirect(`${destino}?mp=ok`);
}
