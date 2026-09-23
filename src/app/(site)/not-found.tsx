import { Compass } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { lockedStore } from "@/server/public/store";

// Página que não existe, dentro do site do cliente. Vale para link
// digitado errado, restaurante que saiu do ar e endereço antigo.
export default async function SiteNotFound() {
  const store = await lockedStore();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 py-6">
      <EmptyState icon={<Compass />} title="Esta página não existe">
        O link pode estar incompleto ou ter mudado de endereço.
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href={store ? `/restaurante/${store.slug}` : "/restaurantes"} className={buttonClasses("primary")}>
            {store ? "Ver o cardápio" : "Ver os restaurantes"}
          </Link>
          {!store && (
            <Link href="/" className={buttonClasses("secondary")}>
              Início
            </Link>
          )}
        </div>
      </EmptyState>
    </div>
  );
}
