// Constantes do site público, usadas no servidor e no navegador.

/** cidade escolhida no topo do site */
export const CITY_COOKIE = "mf_cidade";

/** restaurante em que o cliente entrou pelo link: o site fica só nele (proxy.ts) */
export const STORE_COOKIE = "mf_loja";

/** endereço público do site, para links em mensagens (WhatsApp); só no servidor */
export function appUrl() {
  // na Vercel, sem APP_URL, usa o domínio de produção que ela informa
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return (process.env.APP_URL || (vercel ? `https://${vercel}` : "http://localhost:3000")).replace(/\/+$/, "");
}
