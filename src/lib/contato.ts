// O contato do MenuFácil com os restaurantes.
//
// Fica num lugar só porque aparece em dois mundos que não se conversam: a
// página de quem ainda não é cliente e o painel de quem já é. Trocar o
// número em um e esquecer o outro deixaria metade das pessoas falando
// sozinhas.

/** com DDI, do jeito que o wa.me quer */
export const WHATSAPP_MENUFACIL = "5592999130838"; // (92) 99913-0838

/** o endereço do WhatsApp com a mensagem já escrita; null quando não há contato */
export function linkWhatsappMenuFacil(mensagem: string) {
  const contato = WHATSAPP_MENUFACIL.trim();
  if (!contato) return null;
  if (contato.startsWith("http")) return contato;
  return `https://wa.me/${contato.replace(/\D/g, "")}?text=${encodeURIComponent(mensagem)}`;
}
