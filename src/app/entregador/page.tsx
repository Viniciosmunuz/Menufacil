import { redirect } from "next/navigation";

import { getEntregadorAtual, getCurrentUser } from "@/server/auth/dal";

// A porta do aplicativo do entregador.
//
// É este o endereço que o atalho da tela inicial abre (o `start_url` do
// manifesto), e ele precisa existir: sem esta página, quem salvava o
// aplicativo no celular batia num 404, porque as telas de verdade moram em
// /entregador/<restaurante> e só o servidor sabe qual é o dele.
//
// Com a conta aberta, vai direto para as entregas. Sem conta, vai entrar --
// e, depois de entrar, o /painel devolve para cá, porque a conta de
// entregador não tem painel nenhum para abrir.
export default async function EntregadorIndexPage() {
  const atual = await getEntregadorAtual();
  if (atual) redirect(`/entregador/${atual.restaurant.id}`);

  // está logado, mas não é entregador deste sistema: o lugar dele é o painel
  if (await getCurrentUser()) redirect("/painel");
  redirect("/entrar");
}
