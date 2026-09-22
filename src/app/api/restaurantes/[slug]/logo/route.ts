import sharp from "sharp";

import { db } from "@/lib/db";
import { SHARE_LOGO_SIZE } from "@/lib/site";

// Logo pequena para a prévia do link (WhatsApp, Instagram), no lugar da capa.

export async function GET(request: Request, { params }: RouteContext<"/api/restaurantes/[slug]/logo">) {
  const { slug } = await params;
  const restaurant = await db.restaurant.findUnique({ where: { slug }, select: { logoUrl: true, status: true } });
  if (!restaurant?.logoUrl || restaurant.status !== "ACTIVE") return new Response(null, { status: 404 });

  // a logo da equipe fica em /public; a enviada pelo painel, no Blob
  const source = await fetch(new URL(restaurant.logoUrl, request.url));
  if (!source.ok) return new Response(null, { status: 502 });
  const png = await sharp(Buffer.from(await source.arrayBuffer()))
    .resize(SHARE_LOGO_SIZE, SHARE_LOGO_SIZE, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toBuffer();

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      // o endereço muda junto com a logo (?v=), então pode ficar guardado
      "Cache-Control": "public, max-age=86400, s-maxage=2592000",
    },
  });
}
