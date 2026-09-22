import { NextResponse, type NextRequest } from "next/server";

import { STORE_COOKIE } from "@/lib/site";

// Checagem otimista: sem o cookie de sessão, nem adianta renderizar os
// painéis, manda direto para o login. A checagem de verdade (sessão válida,
// papel, acesso ao restaurante) acontece em src/server/auth/dal.ts.
const SESSION_COOKIE = "mf_sessao";

// Quem chega ao restaurante pelo link dele (WhatsApp, Instagram, digitado)
// fica só naquele restaurante: as páginas que mostram os outros voltam para
// ele. Assim um restaurante não perde o cliente que ele mesmo trouxe.
const STORE_DAYS = 30;
const MARKETPLACE = ["/", "/restaurantes", "/categorias", "/favoritos", "/sobre", "/contato", "/cadastre-seu-restaurante"];

/** navegação vinda de fora do site (a navegação interna do Next não conta) */
function isExternalEntry(request: NextRequest) {
  if (request.method !== "GET" || request.headers.has("rsc") || request.headers.has("next-router-prefetch")) return false;
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "none" || site === "cross-site";
  const referer = request.headers.get("referer");
  if (!referer) return true;
  try {
    return new URL(referer).host !== request.nextUrl.host;
  } catch {
    return true;
  }
}

function storeRules(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const entered = /^\/restaurante\/([a-z0-9-]+)(?:\/|$)/.exec(pathname)?.[1];

  if (entered && isExternalEntry(request)) {
    // o cookie vale já nesta resposta: o layout lê e mostra só o restaurante
    request.cookies.set(STORE_COOKIE, entered);
    const response = NextResponse.next({ request: { headers: request.headers } });
    response.cookies.set(STORE_COOKIE, entered, {
      path: "/",
      maxAge: STORE_DAYS * 24 * 60 * 60,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  }

  const locked = request.cookies.get(STORE_COOKIE)?.value;
  if (!locked) return NextResponse.next();
  const otherStore = !!entered && entered !== locked;
  const marketplace = MARKETPLACE.some((p) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`)));
  // /loja confere se o restaurante ainda existe antes de mandar para ele
  if (otherStore || marketplace) return NextResponse.redirect(new URL("/loja", request.url));
  return NextResponse.next();
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (pathname.startsWith("/admin") || pathname.startsWith("/painel")) {
    if (!hasSession) {
      const login = new URL("/entrar", request.url);
      login.searchParams.set("voltar", pathname);
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

  // vale para todos, logados ou não: quem entrou pelo link vê só o restaurante
  return storeRules(request);
}

export const config = {
  // tudo menos arquivos do Next, API e arquivos com extensão (imagens, ícones)
  matcher: ["/((?!_next/|api/|.*\\.[a-zA-Z0-9]+$).*)"],
};
