import { NextResponse, type NextRequest } from "next/server";

// Checagem otimista: sem o cookie de sessão, nem adianta renderizar os
// painéis, manda direto para o login. A checagem de verdade (sessão válida,
// papel, acesso ao restaurante) acontece em src/server/auth/dal.ts.
const SESSION_COOKIE = "mf_sessao";

export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    const login = new URL("/entrar", request.url);
    login.searchParams.set("voltar", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/painel/:path*"],
};
