import { CircleAlert, CircleCheck, ExternalLink, Send } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { SubmitButton } from "@/components/ui/submit-button";
import type { RestaurantStatus } from "@/generated/prisma/enums";
import { appUrl } from "@/lib/site";
import type { ChecklistItem } from "@/server/restaurants/checklist";

import { requestReview } from "./restaurante/actions";

// Onde resolver cada item da lista de liberação.
const fixHref: Record<string, string> = {
  whatsapp: "restaurante#contato",
  pix: "restaurante#pagamento",
  city: "restaurante#endereco",
  menu: "cardapio",
  service: "restaurante#entrega",
  owner: "",
  hours: "restaurante#horarios",
  logo: "restaurante#informacoes",
};

// Aviso do topo do painel enquanto o restaurante não está no ar.
export function StatusCard({
  restaurantId,
  slug,
  status,
  checklist,
  ready,
  viaAdmin,
}: {
  restaurantId: string;
  slug: string;
  status: RestaurantStatus;
  checklist: ChecklistItem[];
  ready: boolean;
  viaAdmin: boolean;
}) {
  const base = `/painel/${restaurantId}`;

  if (status === "ACTIVE") {
    const url = `${appUrl()}/restaurante/${slug}`;
    return (
      <div className="flex flex-col gap-3 rounded-card border border-success/30 bg-success/10 px-5 py-4">
        <p className="flex items-center gap-2 font-bold text-success">
          <CircleCheck className="size-5" aria-hidden="true" />
          Seu restaurante está no ar e recebendo pedidos.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 flex-1 basis-60 truncate rounded-control border border-line bg-bg/60 px-3 py-2 font-mono text-sm">
            {url.replace(/^https?:\/\//, "")}
          </span>
          <CopyLinkButton url={url} />
          <Link href={`/restaurante/${slug}`} target="_blank" className={buttonClasses("secondary", "sm")}>
            <ExternalLink className="size-4" aria-hidden="true" />
            Ver minha página
          </Link>
        </div>
        <p className="text-sm text-muted">Mande este link aos seus clientes: quem entra por ele vê só o seu restaurante.</p>
      </div>
    );
  }

  if (status === "PENDING_REVIEW") {
    return (
      <div className="rounded-card border border-warning/30 bg-warning/10 px-5 py-4">
        <p className="font-bold text-warning">Pedido de publicação enviado.</p>
        <p className="mt-1 text-sm text-muted">A equipe MenuFácil vai conferir e colocar seu restaurante no ar. Você pode continuar ajustando o cardápio.</p>
      </div>
    );
  }

  if (status === "INACTIVE") {
    return (
      <div className="rounded-card border border-line bg-surface px-5 py-4">
        <p className="font-bold">Seu restaurante está desativado e não aparece no site.</p>
        <p className="mt-1 text-sm text-muted">Fale com a equipe MenuFácil para voltar ao ar.</p>
      </div>
    );
  }

  // em implantação
  const pending = checklist.filter((i) => !i.ok && (i.required || fixHref[i.key]));
  return (
    <div className="rounded-card border border-info/30 bg-info/10 p-5">
      <p className="text-lg font-extrabold">Seu restaurante ainda não está no site</p>
      <p className="mt-1 text-sm text-muted">
        {ready ? "Está tudo pronto para publicar." : "Complete os itens abaixo. Cada um leva poucos minutos."}
      </p>
      {pending.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {pending.map((item) => (
            <li key={item.key}>
              <Link
                href={fixHref[item.key] ? `${base}/${fixHref[item.key]}` : base}
                className="flex items-center gap-2.5 rounded-control bg-bg/40 px-3 py-2.5 text-sm font-bold hover:bg-bg/70"
              >
                <CircleAlert className={item.required ? "size-5 text-warning" : "size-5 text-faint"} aria-hidden="true" />
                {item.label}
                {!item.required && <span className="font-normal text-faint">(recomendado)</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {ready && !viaAdmin && (
        <form action={requestReview} className="mt-4">
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <SubmitButton pendingText="Enviando...">
            <Send className="size-4" aria-hidden="true" />
            Pedir para publicar
          </SubmitButton>
        </form>
      )}
      {ready && viaAdmin && (
        <Link href={`/admin/restaurantes/${restaurantId}`} className={buttonClasses("primary", "md", "mt-4")}>
          Publicar pela ficha do admin
        </Link>
      )}
    </div>
  );
}
