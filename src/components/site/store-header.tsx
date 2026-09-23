import Image from "next/image";
import Link from "next/link";

import { LogoIcon } from "@/components/brand/logo";

import { CartIconLink } from "./cart-icon";

/** topo de quem entrou pelo link do restaurante: só ele, sem busca nem outros restaurantes */
export function StoreHeader({ store }: { store: { slug: string; name: string; logoUrl: string | null } }) {
  return (
    <header className="z-30 border-b border-line bg-bg/90 backdrop-blur lg:sticky lg:top-0">
      <div className="mx-auto flex max-w-[90rem] items-center gap-3 px-4 py-3 lg:px-6">
        <Link href={`/restaurante/${store.slug}`} className="flex min-w-0 items-center gap-3">
          <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-surface-3">
            {store.logoUrl ? (
              <Image src={store.logoUrl} alt="" fill sizes="40px" className="object-cover" />
            ) : (
              <LogoIcon className="h-5" />
            )}
          </span>
          <span className="truncate text-lg font-extrabold">{store.name}</span>
        </Link>
        <CartIconLink className="ml-auto" />
      </div>
    </header>
  );
}
