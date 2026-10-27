import { CheckCircle2, XCircle } from "lucide-react";
import type { Metadata } from "next";

import { LogoIcon } from "@/components/brand/logo";

// Para onde o dono do restaurante volta depois de conectar o WhatsApp pelo
// link do Menu Fácil IA.
//
// Só diz se deu certo. Não grava nada: o que o navegador traz de volta pode
// ser digitado por qualquer um, então a conexão é conferida pelo admin,
// perguntando à Kapso.

export const metadata: Metadata = { title: "WhatsApp conectado", robots: { index: false } };

export default async function WhatsappConectadoPage({ searchParams }: PageProps<"/whatsapp-conectado">) {
  const sp = await searchParams;
  const deuCerto = sp.status === "completed";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <LogoIcon className="h-12" />
      {deuCerto ? (
        <CheckCircle2 className="size-14 text-success" aria-hidden="true" />
      ) : (
        <XCircle className="size-14 text-danger" aria-hidden="true" />
      )}
      <h1 className="text-2xl font-extrabold tracking-tight">
        {deuCerto ? "WhatsApp conectado!" : "A conexão não terminou"}
      </h1>
      <p className="text-muted">
        {deuCerto
          ? "Pronto. Você continua usando o WhatsApp no celular normalmente. Já pode fechar esta página — a equipe do MenuFácil cuida do resto."
          : "Pode tentar de novo pelo mesmo link. Se não der certo, fale com a equipe do MenuFácil."}
      </p>
    </main>
  );
}
