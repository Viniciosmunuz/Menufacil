import { APP_SETUP_PATH, APP_VERSION } from "@/lib/app-release";
import { appUrl } from "@/lib/site";

// O Menu Fácil para PC pergunta aqui, toda vez que abre, qual é o endereço
// oficial do sistema.
//
// Hoje a resposta é o mesmo endereço de onde veio a pergunta. Quando o
// domínio de verdade entrar, o endereço antigo continua respondendo e passa
// a apontar para o novo: os programas já instalados se mudam sozinhos, sem
// ninguém reinstalar nada em balcão nenhum.

export const dynamic = "force-dynamic";

export function GET() {
  const servidor = appUrl();
  return Response.json(
    { servidor, versao: APP_VERSION, instalador: `${servidor}${APP_SETUP_PATH}` },
    { headers: { "cache-control": "no-store" } },
  );
}
