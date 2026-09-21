import "server-only";

import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { del, put } from "@vercel/blob";
import sharp, { type Sharp } from "sharp";

// Fotos do restaurante e do cardápio. Toda imagem passa pelo sharp: gira
// conforme a câmera, reduz para o tamanho de uso, vira WebP e perde os
// metadados (inclusive a localização GPS que o celular grava na foto).
//
// O armazenamento fica atrás de um "driver": "local" grava em public/uploads
// (só desenvolvimento); "vercel-blob" usa o Vercel Blob, ligado sozinho
// quando existe BLOB_READ_WRITE_TOKEN. Outro provedor (S3/R2) entra aqui sem
// mudar quem chama saveImage.

export type ImageKind = "logo" | "cover" | "product";

const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

const presets: Record<ImageKind, (img: Sharp) => Sharp> = {
  logo: (img) => img.resize(512, 512, { fit: "cover" }),
  cover: (img) => img.resize(1600, 900, { fit: "cover" }),
  product: (img) => img.resize(1000, 1000, { fit: "inside", withoutEnlargement: true }),
};

export class ImageError extends Error {}

interface StorageDriver {
  put(key: string, data: Buffer, contentType: string): Promise<string>;
  remove(url: string): Promise<void>;
}

const localDriver: StorageDriver = {
  async put(key, data) {
    const file = path.join(process.cwd(), "public", "uploads", key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
    return `/uploads/${key}`;
  },
  async remove(url) {
    if (!url.startsWith("/uploads/") || url.includes("..")) return;
    await unlink(path.join(process.cwd(), "public", url)).catch(() => {});
  },
};

const vercelBlobDriver: StorageDriver = {
  async put(key, data, contentType) {
    const blob = await put(`menufacil/${key}`, data, {
      access: "public",
      contentType,
      addRandomSuffix: false, // o nome já é aleatório
      cacheControlMaxAge: 60 * 60 * 24 * 365, // nome novo a cada troca: pode guardar por muito tempo
    });
    return blob.url;
  },
  async remove(url) {
    if (!/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//.test(url)) return;
    await del(url);
  },
};

function driver(): StorageDriver {
  const name =
    process.env.STORAGE_DRIVER ||
    (process.env.BLOB_READ_WRITE_TOKEN ? "vercel-blob" : process.env.NODE_ENV === "production" ? "" : "local");
  if (name === "local") return localDriver;
  if (name === "vercel-blob") return vercelBlobDriver;
  throw new ImageError("O envio de fotos ainda não está configurado neste servidor.");
}

/** um arquivo de verdade foi escolhido no campo? */
export function hasFile(value: FormDataEntryValue | null): value is File {
  return typeof value === "object" && value !== null && value.size > 0;
}

export async function saveImage(params: { restaurantId: string; kind: ImageKind; file: File }) {
  const { restaurantId, kind, file } = params;
  if (file.size > MAX_INPUT_BYTES) throw new ImageError("A foto é muito grande. Use uma de até 8 MB.");
  if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
    throw new ImageError("Formato de foto não aceito. Use JPG, PNG ou WebP.");
  }

  let output: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    output = await presets[kind](sharp(input, { failOn: "error" }).rotate()).webp({ quality: 80 }).toBuffer();
  } catch {
    throw new ImageError("Não consegui abrir essa foto. Tente outra ou tire um print dela.");
  }

  const key = `${restaurantId}/${kind}-${randomBytes(8).toString("hex")}.webp`;
  return driver().put(key, output, "image/webp");
}

export async function deleteImage(url: string | null | undefined) {
  if (!url) return;
  try {
    await driver().remove(url);
  } catch {
    // apagar a foto antiga não pode impedir a alteração principal
  }
}
