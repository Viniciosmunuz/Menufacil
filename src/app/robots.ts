import type { MetadataRoute } from "next";

import { appUrl } from "@/lib/site";

// O que os buscadores podem visitar. O site público é aberto; o painel, o
// carrinho e tudo que é de uma pessoa só ficam de fora — não têm o que
// mostrar em busca e não devem aparecer para estranhos.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/painel", "/admin", "/entrar", "/conta", "/api", "/carrinho", "/favoritos", "/meus-pedidos", "/pedido", "/loja"],
    },
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
