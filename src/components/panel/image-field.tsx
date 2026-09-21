"use client";

import { Camera, ImageOff } from "lucide-react";
/* eslint-disable @next/next/no-img-element -- prévia local (blob:) antes do envio */
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

// Campo de foto. A foto do celular (às vezes 5 MB) é reduzida aqui mesmo,
// no navegador, antes de enviar: sobe rápido no 4G e cabe no limite do
// servidor. O servidor ainda reprocessa e limpa os metadados.

async function shrink(file: File, maxSide: number): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    if (!blob) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "foto"}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function ImageField({
  name,
  label,
  currentUrl,
  removeName,
  shape = "wide",
  maxSide = 1600,
  hint,
}: {
  name: string;
  label: string;
  currentUrl: string | null;
  /** nome do campo que pede para apagar a foto atual */
  removeName?: string;
  shape?: "round" | "wide" | "square";
  maxSide?: number;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  // depois de enviar, o React limpa o formulário (e o arquivo escolhido):
  // a prévia volta a mostrar o que está salvo de verdade
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const onReset = () => {
      setPreview(null);
      setRemoved(false);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    const small = await shrink(file, maxSide);
    if (small !== file) {
      const transfer = new DataTransfer();
      transfer.items.add(small);
      input.files = transfer.files;
    }
    setPreview(URL.createObjectURL(small));
    setRemoved(false);
    setBusy(false);
  }

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    setPreview(null);
    setRemoved(true);
  }

  const shown = preview ?? (removed ? null : currentUrl);
  const frame = {
    round: "size-24 rounded-full",
    square: "size-28 rounded-card",
    wide: "aspect-[16/9] w-full max-w-md rounded-card",
  }[shape];

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-bold">{label}</span>
      <div className={cn("flex gap-4", shape === "wide" ? "flex-col" : "items-center")}>
        <div className={cn("grid shrink-0 place-items-center overflow-hidden border border-line bg-surface-2 text-faint", frame)}>
          {shown ? (
            <img src={shown} alt="" className="size-full object-cover" />
          ) : (
            <ImageOff className="size-7" aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label
            className={cn(
              "inline-flex h-11 cursor-pointer items-center gap-2 rounded-control border border-line bg-surface-2 px-4 font-bold hover:bg-surface-3",
              "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40",
            )}
          >
            <Camera className="size-4" aria-hidden="true" />
            {busy ? "Preparando..." : shown ? "Trocar foto" : "Escolher foto"}
            <input
              ref={inputRef}
              type="file"
              name={name}
              accept="image/jpeg,image/png,image/webp"
              onChange={onChange}
              className="sr-only"
            />
          </label>
          {shown && removeName && (
            <button type="button" onClick={clear} className="h-11 px-3 text-sm font-bold text-muted hover:text-danger">
              Remover
            </button>
          )}
          {removeName && <input type="hidden" name={removeName} value={removed ? "on" : ""} />}
        </div>
      </div>
      {hint && <p className="text-sm text-faint">{hint}</p>}
    </div>
  );
}
