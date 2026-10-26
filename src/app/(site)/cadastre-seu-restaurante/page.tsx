import { permanentRedirect } from "next/navigation";

// A página de venda virou a principal.
//
// Este endereço ficou de pé porque ele está no Instagram, em QR impresso e
// em conversa de WhatsApp de meses atrás. Quem abrir vai parar na home, que
// é onde a mesma coisa mora agora -- e o buscador aprende sozinho, pelo
// 308, que o endereço mudou de casa.
export default function CadastreSeuRestaurantePage(): never {
  permanentRedirect("/");
}
