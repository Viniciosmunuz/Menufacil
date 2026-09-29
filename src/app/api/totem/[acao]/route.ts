import { desbloquear } from "@/server/totem/api/desbloquear";
import { login } from "@/server/totem/api/login";
import { cancelar, cobrar, conferir } from "@/server/totem/api/pagamento";
import { parear } from "@/server/totem/api/parear";
import { webhook } from "@/server/totem/api/webhook";

// Uma porta só para tudo que o totem pede.
//
// Os endereços são os mesmos de sempre (/api/totem/login, /api/totem/
// pagamento, ...): o que mudou é que eles entram por aqui em vez de cada um
// ter o próprio arquivo de rota.
//
// O motivo é do servidor, não do código: na Vercel cada rota vira uma
// função, e o plano do MenuFácil hoje aceita 12. As cinco portas do totem
// sozinhas comiam quase metade. Juntas, gastam uma.
//
// Quem faz o trabalho continua em src/server/totem/api/, um arquivo por
// assunto -- só a porta de entrada é compartilhada.

export const dynamic = "force-dynamic";

const naoExiste = () => Response.json({ erro: "não existe" }, { status: 404 });

export async function POST(request: Request, { params }: RouteContext<"/api/totem/[acao]">) {
  const { acao } = await params;
  switch (acao) {
    case "login":
      return login(request);
    case "parear":
      return parear(request);
    case "desbloquear":
      return desbloquear(request);
    case "pagamento":
      return cobrar(request);
    case "webhook":
      return webhook(request);
    default:
      return naoExiste();
  }
}

export async function GET(request: Request, { params }: RouteContext<"/api/totem/[acao]">) {
  const { acao } = await params;
  return acao === "pagamento" ? conferir(request) : naoExiste();
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/totem/[acao]">) {
  const { acao } = await params;
  return acao === "pagamento" ? cancelar(request) : naoExiste();
}
