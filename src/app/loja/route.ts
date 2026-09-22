import { NextResponse, type NextRequest } from "next/server";

import { STORE_COOKIE } from "@/lib/site";
import { lockedStore } from "@/server/public/store";

// Para onde vai o cliente travado num restaurante que tenta abrir outra
// página do site. Se o restaurante saiu do ar, a trava acaba aqui.
// /loja?sair tira a trava do aparelho (para testes).
export async function GET(request: NextRequest) {
  const store = request.nextUrl.searchParams.has("sair") ? null : await lockedStore();
  if (store) return NextResponse.redirect(new URL(`/restaurante/${store.slug}`, request.url));
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete(STORE_COOKIE);
  return response;
}
