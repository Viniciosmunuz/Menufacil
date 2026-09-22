"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { cn } from "@/lib/cn";

// Editor dos grupos de opções (Tamanho, Sabor, Porção...). Vai para o
// servidor num campo escondido, em JSON; o servidor confere tudo de novo.

export type EditableOption = { id?: string; name: string; price: string; available: boolean };
export type EditableGroup = { id?: string; name: string; required: boolean; max: number; options: EditableOption[] };

const newOption = (): EditableOption => ({ name: "", price: "", available: true });
const newGroup = (): EditableGroup => ({ name: "", required: true, max: 1, options: [newOption(), newOption()] });

// modelos comuns para começar mais rápido
const TEMPLATES: { label: string; group: () => EditableGroup }[] = [
  {
    label: "Meia / Inteira",
    group: () => ({ name: "Porção", required: true, max: 1, options: [{ name: "Meia", price: "0,00", available: true }, { name: "Inteira", price: "", available: true }] }),
  },
  {
    label: "Tamanho P / M / G",
    group: () => ({
      name: "Tamanho",
      required: true,
      max: 1,
      options: [
        { name: "Pequeno", price: "0,00", available: true },
        { name: "Médio", price: "", available: true },
        { name: "Grande", price: "", available: true },
      ],
    }),
  },
  { label: "Adicionais", group: () => ({ name: "Adicionais", required: false, max: 5, options: [newOption()] }) },
];

export function OptionGroupsEditor({ initial, error }: { initial: EditableGroup[]; error?: string }) {
  const [groups, setGroups] = useState<EditableGroup[]>(initial);

  const updateGroup = (index: number, patch: Partial<EditableGroup>) =>
    setGroups((gs) => gs.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  const updateOption = (gi: number, oi: number, patch: Partial<EditableOption>) =>
    setGroups((gs) => gs.map((g, i) => (i === gi ? { ...g, options: g.options.map((o, j) => (j === oi ? { ...o, ...patch } : o)) } : g)));

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="optionGroups" value={JSON.stringify(groups)} />
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {groups.length === 0 && (
        <p className="text-sm text-muted">Sem opções: o cliente só escolhe a quantidade. Use para tamanho, sabor, meia/inteira ou adicionais.</p>
      )}

      {groups.map((g, gi) => (
        <div key={gi} className="flex flex-col gap-3 rounded-control border border-line bg-surface-2/50 p-4">
          <div className="flex items-end gap-2">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-sm font-bold">Nome do grupo</span>
              <Input value={g.name} onChange={(e) => updateGroup(gi, { name: e.target.value })} maxLength={40} placeholder="Ex.: Tamanho" />
            </label>
            <Button variant="ghost" onClick={() => setGroups((gs) => gs.filter((_, i) => i !== gi))} aria-label={`Remover o grupo ${g.name || gi + 1}`}>
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <label className="flex items-center gap-2 font-semibold">
              <input type="checkbox" checked={g.required} onChange={(e) => updateGroup(gi, { required: e.target.checked })} className="size-4 accent-brand" />
              Obrigatório escolher
            </label>
            <label className="flex items-center gap-2 font-semibold">
              Pode escolher até
              <Input
                type="number"
                min={1}
                max={20}
                value={g.max}
                onChange={(e) => updateGroup(gi, { max: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
                className="h-10 w-20"
              />
            </label>
          </div>

          <ul className="flex flex-col gap-2">
            {g.options.map((o, oi) => (
              <li key={oi} className="flex flex-wrap items-center gap-2">
                <Input
                  value={o.name}
                  onChange={(e) => updateOption(gi, oi, { name: e.target.value })}
                  maxLength={60}
                  placeholder="Opção (ex.: Grande)"
                  aria-label="Nome da opção"
                  className="h-11 min-w-0 flex-1 basis-40"
                />
                <MoneyInput
                  value={o.price}
                  onChange={(e) => updateOption(gi, oi, { price: e.target.value })}
                  aria-label="Valor a mais"
                  className="h-11 w-32"
                />
                <label className={cn("flex items-center gap-1.5 text-sm font-semibold", !o.available && "text-faint")}>
                  <input
                    type="checkbox"
                    checked={o.available}
                    onChange={(e) => updateOption(gi, oi, { available: e.target.checked })}
                    className="size-4 accent-brand"
                  />
                  Tem
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateGroup(gi, { options: g.options.filter((_, j) => j !== oi) })}
                  aria-label={`Remover a opção ${o.name || oi + 1}`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
          <div>
            <Button variant="secondary" size="sm" onClick={() => updateGroup(gi, { options: [...g.options, newOption()] })}>
              <Plus className="size-4" aria-hidden="true" />
              Adicionar opção
            </Button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => setGroups((gs) => [...gs, newGroup()])}>
          <Plus className="size-4" aria-hidden="true" />
          Novo grupo de opções
        </Button>
        {TEMPLATES.map((t) => (
          <Button key={t.label} variant="ghost" size="sm" onClick={() => setGroups((gs) => [...gs, t.group()])}>
            <Plus className="size-4" aria-hidden="true" />
            {t.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
