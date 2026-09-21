import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";

// Provisória: a home completa (busca, categorias, restaurantes em destaque)
// entra na etapa da área pública.
export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10 text-center">
      <Logo withSlogan />
      <div className="max-w-xl">
        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
          Ainda não tem um restaurante <span className="text-brand">cadastrado</span> aqui?
        </h1>
        <p className="mt-4 text-lg text-muted">
          Em breve você encontra por aqui os melhores restaurantes, lanchonetes e pizzarias da sua região.
        </p>
        <p className="mt-6 font-script text-3xl text-ink/90">Em breve, novos sabores por aqui!</p>
      </div>
      <Link href="/entrar" className={buttonClasses("primary", "lg")}>
        Entrar no painel
      </Link>
    </main>
  );
}
