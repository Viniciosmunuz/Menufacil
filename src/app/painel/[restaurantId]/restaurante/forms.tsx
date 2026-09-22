"use client";

import { useState } from "react";

import { ImageField } from "@/components/panel/image-field";
import { SectionForm } from "@/components/panel/section-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { MoneyInput, centsToInput } from "@/components/ui/money-input";
import type { OpenMode, PixKeyType } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/format";
import { WEEKDAYS, type OpeningHourData } from "@/lib/opening-hours";
import { PIX_KEY_TYPES, formatPixKey, pixKeyTypeLabel } from "@/lib/pix";

import { saveAddress, saveContact, saveDelivery, saveHours, saveInfo, savePayment, savePaymentMethods } from "./actions";

export type RestaurantFormData = {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  openMode: OpenMode;
  hours: OpeningHourData[];
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  deliveryFeeCents: number;
  minOrderCents: number;
  deliveryTimeMin: number | null;
  deliveryTimeMax: number | null;
  pixKey: string | null;
  pixKeyType: PixKeyType | null;
  pixHolderName: string | null;
  paymentInstructions: string | null;
  acceptsCard: boolean;
  acceptsCash: boolean;
};

/** valor do campo: o que a pessoa digitou (se voltou com erro) ou o salvo */
const pick = (values: Record<string, string> | undefined, key: string, saved: string | null | undefined) =>
  values && key in values ? values[key] : (saved ?? "");

export function InfoSection({ r }: { r: RestaurantFormData }) {
  return (
    <SectionForm id="informacoes" title="Informações e fotos" action={saveInfo} restaurantId={r.id}>
      {(s) => (
        <>
          <Field label="Nome do restaurante" htmlFor="name" error={s.fieldErrors?.name}>
            <Input id="name" name="name" required maxLength={80} defaultValue={pick(s.values, "name", r.name)} aria-invalid={!!s.fieldErrors?.name} />
          </Field>
          <Field
            label="Descrição curta"
            htmlFor="description"
            error={s.fieldErrors?.description}
            hint="Uma frase sobre a casa. Aparece no topo da sua página."
          >
            <Textarea
              id="description"
              name="description"
              maxLength={300}
              rows={3}
              defaultValue={pick(s.values, "description", r.description)}
              placeholder="Ex.: Pizzas artesanais no forno a lenha desde 2010."
            />
          </Field>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-[auto_1fr]">
            <ImageField name="logo" removeName="removeLogo" label="Logo" currentUrl={r.logoUrl} shape="round" maxSide={800} />
            <ImageField
              name="cover"
              removeName="removeCover"
              label="Foto de capa"
              currentUrl={r.coverUrl}
              hint="Uma foto bonita da fachada ou de um prato. Deitada fica melhor."
            />
          </div>
        </>
      )}
    </SectionForm>
  );
}

export function ContactSection({ r }: { r: RestaurantFormData }) {
  return (
    <SectionForm
      id="contato"
      title="Contato"
      description="O WhatsApp dos pedidos é onde o restaurante recebe cada pedido novo."
      action={saveContact}
      restaurantId={r.id}
    >
      {(s) => (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="WhatsApp dos pedidos" htmlFor="whatsapp" error={s.fieldErrors?.whatsapp}>
            <Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" defaultValue={pick(s.values, "whatsapp", formatPhone(r.whatsapp))} placeholder="(92) 99999-0000" aria-invalid={!!s.fieldErrors?.whatsapp} />
          </Field>
          <Field label="Telefone fixo" htmlFor="phone" error={s.fieldErrors?.phone} hint="Opcional.">
            <Input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={pick(s.values, "phone", formatPhone(r.phone))} placeholder="(92) 3000-0000" aria-invalid={!!s.fieldErrors?.phone} />
          </Field>
          <Field label="E-mail" htmlFor="email" error={s.fieldErrors?.email} hint="Opcional.">
            <Input id="email" name="email" type="email" inputMode="email" defaultValue={pick(s.values, "email", r.email)} aria-invalid={!!s.fieldErrors?.email} />
          </Field>
          <Field label="Instagram" htmlFor="instagram" error={s.fieldErrors?.instagram} hint="Opcional.">
            <Input id="instagram" name="instagram" defaultValue={pick(s.values, "instagram", r.instagram ? `@${r.instagram}` : "")} placeholder="@seurestaurante" aria-invalid={!!s.fieldErrors?.instagram} />
          </Field>
        </div>
      )}
    </SectionForm>
  );
}

export function AddressSection({ r }: { r: RestaurantFormData }) {
  return (
    <SectionForm id="endereco" title="Endereço" action={saveAddress} restaurantId={r.id}>
      {(s) => (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-6">
          <Field label="Rua / avenida" htmlFor="street" error={s.fieldErrors?.street} className="sm:col-span-4">
            <Input id="street" name="street" maxLength={120} defaultValue={pick(s.values, "street", r.street)} autoComplete="address-line1" />
          </Field>
          <Field label="Número" htmlFor="number" error={s.fieldErrors?.number} className="sm:col-span-2">
            <Input id="number" name="number" maxLength={20} defaultValue={pick(s.values, "number", r.number)} />
          </Field>
          <Field label="Bairro" htmlFor="neighborhood" error={s.fieldErrors?.neighborhood} className="sm:col-span-3">
            <Input id="neighborhood" name="neighborhood" maxLength={80} defaultValue={pick(s.values, "neighborhood", r.neighborhood)} />
          </Field>
          <Field label="Complemento" htmlFor="complement" error={s.fieldErrors?.complement} hint="Opcional." className="sm:col-span-3">
            <Input id="complement" name="complement" maxLength={80} defaultValue={pick(s.values, "complement", r.complement)} />
          </Field>
          <Field label="Cidade" htmlFor="city" error={s.fieldErrors?.city} className="sm:col-span-3">
            <Input id="city" name="city" required maxLength={80} defaultValue={pick(s.values, "city", r.city)} aria-invalid={!!s.fieldErrors?.city} />
          </Field>
          <Field label="Estado" htmlFor="state" error={s.fieldErrors?.state} className="sm:col-span-1">
            <Input id="state" name="state" maxLength={2} defaultValue={pick(s.values, "state", r.state)} className="uppercase" aria-invalid={!!s.fieldErrors?.state} />
          </Field>
          <Field label="CEP" htmlFor="zipCode" error={s.fieldErrors?.zipCode} hint="Opcional." className="sm:col-span-2">
            <Input id="zipCode" name="zipCode" inputMode="numeric" maxLength={9} defaultValue={pick(s.values, "zipCode", r.zipCode)} aria-invalid={!!s.fieldErrors?.zipCode} />
          </Field>
        </div>
      )}
    </SectionForm>
  );
}

const openModes: { value: OpenMode; title: string; text: string }[] = [
  { value: "AUTO", title: "Seguir o horário", text: "Abre e fecha sozinho pelos horários abaixo." },
  { value: "OPEN", title: "Aberto agora", text: "Fica aberto até você mudar." },
  { value: "CLOSED", title: "Fechado agora", text: "Não recebe pedidos até você mudar." },
];

function DayRow({
  weekday,
  saved,
  values,
  error,
}: {
  weekday: number;
  saved?: OpeningHourData;
  values?: Record<string, string>;
  error?: string;
}) {
  // voltou com erro: mantém o que a pessoa marcou; senão, o que está salvo
  const [open, setOpen] = useState(values ? values[`day${weekday}_open`] === "on" : saved ? !saved.closed : false);
  const time = (field: "opensAt" | "closesAt", fallback: string) =>
    values?.[`day${weekday}_${field}`] || saved?.[field] || fallback;
  return (
    <div className={cn("rounded-control border px-4 py-3", open ? "border-line bg-surface-2" : "border-line/60")}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <label className="flex min-w-32 cursor-pointer items-center gap-3 font-bold">
          <input
            type="checkbox"
            name={`day${weekday}_open`}
            checked={open}
            onChange={(e) => setOpen(e.target.checked)}
            className="size-5 accent-brand"
          />
          {WEEKDAYS[weekday]}
        </label>
        <div className={cn("items-center gap-2", open ? "flex" : "hidden")}>
            <Input
              type="time"
              name={`day${weekday}_opensAt`}
              defaultValue={time("opensAt", "18:00")}
              aria-label={`${WEEKDAYS[weekday]}: abre às`}
              className="h-11 w-32"
            />
            <span className="text-sm text-muted">às</span>
            <Input
              type="time"
              name={`day${weekday}_closesAt`}
              defaultValue={time("closesAt", "23:00")}
              aria-label={`${WEEKDAYS[weekday]}: fecha às`}
              className="h-11 w-32"
            />
        </div>
        {!open && <span className="text-sm text-faint">Fechado</span>}
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}

export function HoursSection({ r }: { r: RestaurantFormData }) {
  const [mode, setMode] = useState<OpenMode>(r.openMode);
  return (
    <SectionForm
      id="horarios"
      title="Horário de funcionamento"
      description="Se fechar depois da meia-noite, é só colocar, por exemplo, 18:00 às 02:00."
      action={saveHours}
      restaurantId={r.id}
    >
      {(s) => (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Como abrir e fechar">
            {openModes.map((m) => (
              <label
                key={m.value}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-control border px-4 py-3",
                  mode === m.value ? "border-brand bg-brand-soft" : "border-line bg-surface-2 hover:border-line-strong",
                )}
              >
                <input
                  type="radio"
                  name="openMode"
                  value={m.value}
                  checked={mode === m.value}
                  onChange={() => setMode(m.value)}
                  className="mt-1 size-4 accent-brand"
                />
                <span>
                  <span className="block font-bold">{m.title}</span>
                  <span className="block text-sm text-muted">{m.text}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3, 4, 5, 6].map((weekday) => (
              <DayRow
                key={weekday}
                weekday={weekday}
                saved={r.hours.find((h) => h.weekday === weekday)}
                values={s.values}
                error={s.fieldErrors?.[`day${weekday}`]}
              />
            ))}
          </div>
        </>
      )}
    </SectionForm>
  );
}

export function DeliverySection({ r }: { r: RestaurantFormData }) {
  return (
    <SectionForm id="entrega" title="Entrega e retirada" action={saveDelivery} restaurantId={r.id}>
      {(s) => (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Checkbox name="deliveryEnabled" defaultChecked={s.values ? s.values.deliveryEnabled === "on" : r.deliveryEnabled} label="Faz entrega" hint="O cliente informa o endereço." />
            <Checkbox name="pickupEnabled" defaultChecked={s.values ? s.values.pickupEnabled === "on" : r.pickupEnabled} label="Retirada no local" hint="O cliente busca no restaurante." />
          </div>
          {s.fieldErrors?.pickupEnabled && <p className="text-sm text-danger">{s.fieldErrors.pickupEnabled}</p>}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Taxa de entrega" htmlFor="deliveryFee" error={s.fieldErrors?.deliveryFee} hint="Deixe 0,00 para entrega grátis.">
              <MoneyInput id="deliveryFee" name="deliveryFee" defaultValue={pick(s.values, "deliveryFee", centsToInput(r.deliveryFeeCents))} aria-invalid={!!s.fieldErrors?.deliveryFee} />
            </Field>
            <Field label="Pedido mínimo" htmlFor="minOrder" error={s.fieldErrors?.minOrder} hint="Opcional. 0,00 = sem mínimo.">
              <MoneyInput id="minOrder" name="minOrder" defaultValue={pick(s.values, "minOrder", centsToInput(r.minOrderCents))} aria-invalid={!!s.fieldErrors?.minOrder} />
            </Field>
            <Field label="Tempo de entrega: de (minutos)" htmlFor="deliveryTimeMin" error={s.fieldErrors?.deliveryTimeMin}>
              <Input id="deliveryTimeMin" name="deliveryTimeMin" inputMode="numeric" defaultValue={pick(s.values, "deliveryTimeMin", r.deliveryTimeMin?.toString())} placeholder="30" aria-invalid={!!s.fieldErrors?.deliveryTimeMin} />
            </Field>
            <Field label="até (minutos)" htmlFor="deliveryTimeMax" error={s.fieldErrors?.deliveryTimeMax}>
              <Input id="deliveryTimeMax" name="deliveryTimeMax" inputMode="numeric" defaultValue={pick(s.values, "deliveryTimeMax", r.deliveryTimeMax?.toString())} placeholder="50" aria-invalid={!!s.fieldErrors?.deliveryTimeMax} />
            </Field>
          </div>
        </>
      )}
    </SectionForm>
  );
}

export function PaymentMethodsSection({ r }: { r: RestaurantFormData }) {
  return (
    <SectionForm
      id="formas-de-pagamento"
      title="Cartão e dinheiro"
      description="Pagos na entrega (o entregador leva a maquininha e o troco) ou no balcão, na retirada."
      action={savePaymentMethods}
      restaurantId={r.id}
    >
      {(s) => (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Checkbox
            name="acceptsCard"
            defaultChecked={s.values ? s.values.acceptsCard === "on" : r.acceptsCard}
            label="Aceita cartão"
            hint="Crédito e débito. O cliente diz qual vai usar."
          />
          <Checkbox
            name="acceptsCash"
            defaultChecked={s.values ? s.values.acceptsCash === "on" : r.acceptsCash}
            label="Aceita dinheiro"
            hint="O cliente diz se precisa de troco e para quanto."
          />
        </div>
      )}
    </SectionForm>
  );
}

export function PaymentSection({ r }: { r: RestaurantFormData }) {
  return (
    <SectionForm
      id="pagamento"
      title="Pagamento por Pix"
      description="Depois do pedido, o cliente vê esta chave para pagar e manda o comprovante pelo WhatsApp."
      action={savePayment}
      restaurantId={r.id}
    >
      {(s) => (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[12rem_1fr]">
          <Field label="Tipo da chave" htmlFor="pixKeyType" error={s.fieldErrors?.pixKeyType}>
            <Select id="pixKeyType" name="pixKeyType" required defaultValue={pick(s.values, "pixKeyType", r.pixKeyType)} aria-invalid={!!s.fieldErrors?.pixKeyType}>
              <option value="" disabled>
                Escolha
              </option>
              {PIX_KEY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {pixKeyTypeLabel[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Chave Pix" htmlFor="pixKey" error={s.fieldErrors?.pixKey}>
            <Input
              id="pixKey"
              name="pixKey"
              required
              maxLength={120}
              autoComplete="off"
              defaultValue={pick(s.values, "pixKey", r.pixKey ? formatPixKey(r.pixKeyType, r.pixKey) : "")}
              aria-invalid={!!s.fieldErrors?.pixKey}
            />
          </Field>
          <Field
            label="Nome de quem recebe"
            htmlFor="pixHolderName"
            error={s.fieldErrors?.pixHolderName}
            hint="Como aparece no app do banco. O cliente confere antes de pagar."
            className="sm:col-span-2"
          >
            <Input id="pixHolderName" name="pixHolderName" required maxLength={80} defaultValue={pick(s.values, "pixHolderName", r.pixHolderName)} aria-invalid={!!s.fieldErrors?.pixHolderName} />
          </Field>
          <Field
            label="Recado para o cliente"
            htmlFor="paymentInstructions"
            error={s.fieldErrors?.paymentInstructions}
            hint="Opcional. Ex.: Confirmamos o pagamento em até 5 minutos."
            className="sm:col-span-2"
          >
            <Textarea id="paymentInstructions" name="paymentInstructions" maxLength={300} rows={2} defaultValue={pick(s.values, "paymentInstructions", r.paymentInstructions)} />
          </Field>
        </div>
      )}
    </SectionForm>
  );
}
