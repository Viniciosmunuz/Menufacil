import "server-only";

import { randomUUID } from "node:crypto";

import type { WhatsAppIntegration } from "@/generated/prisma/client";
import type { WhatsAppProvider } from "@/generated/prisma/enums";

import { decryptSecret } from "./crypto";

// Integração com o WhatsApp. Só a API oficial da Meta (WhatsApp Business
// Platform / Cloud API) ou o mock de desenvolvimento. Nada de WhatsApp Web.
//
// Regras da Meta que moldam isto aqui:
// - a empresa só inicia conversa com MODELO (template) aprovado; texto livre
//   só vale dentro de 24h depois que a pessoa mandou mensagem;
// - as mensagens saem do número da plataforma (ou do número que o
//   restaurante conectar, no futuro), com token guardado no servidor.

export type OutgoingMessage = {
  to: string;
  body: string;
  templateName: string | null;
  templateParams: string[] | null;
};

export class ProviderError extends Error {
  constructor(
    message: string,
    /** vale tentar de novo mais tarde (instabilidade, limite de envio) */
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

export interface WhatsAppClient {
  readonly name: WhatsAppProvider;
  send(message: OutgoingMessage): Promise<{ providerMessageId: string }>;
}

/** desenvolvimento: não envia nada, só registra (e mostra no terminal) */
class MockClient implements WhatsAppClient {
  readonly name = "MOCK" as const;
  async send(message: OutgoingMessage) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`\n[whatsapp:mock] para +${message.to}\n${message.body}\n`);
    }
    return { providerMessageId: `mock_${randomUUID()}` };
  }
}

type CloudConfig = { phoneNumberId: string; accessToken: string };

class CloudApiClient implements WhatsAppClient {
  readonly name = "CLOUD_API" as const;
  constructor(private readonly config: CloudConfig) {}

  async send(message: OutgoingMessage) {
    const version = process.env.WHATSAPP_API_VERSION || "v23.0";
    const language = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "pt_BR";
    const useTemplate = !!message.templateName && process.env.WHATSAPP_USE_TEMPLATES !== "false";

    const payload = useTemplate
      ? {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: message.to,
          type: "template",
          template: {
            name: message.templateName,
            language: { code: language },
            components: [
              { type: "body", parameters: (message.templateParams ?? []).map((text) => ({ type: "text", text })) },
            ],
          },
        }
      : {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: message.to,
          type: "text",
          text: { preview_url: false, body: message.body.slice(0, 4096) },
        };

    let response: Response;
    try {
      response = await fetch(`https://graph.facebook.com/${version}/${this.config.phoneNumberId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.config.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      throw new ProviderError(`Sem resposta da Meta: ${(error as Error).message}`, true);
    }

    const data = (await response.json().catch(() => null)) as {
      messages?: { id: string }[];
      error?: { message?: string; code?: number; error_data?: { details?: string } };
    } | null;

    if (!response.ok || !data?.messages?.[0]?.id) {
      const code = data?.error?.code;
      const detail = data?.error?.error_data?.details ?? data?.error?.message ?? `HTTP ${response.status}`;
      // 429/5xx e limites de envio passam; o resto (número inválido, modelo
      // não aprovado, token vencido) não adianta repetir
      const retryable = response.status >= 500 || response.status === 429 || code === 130429 || code === 131000;
      throw new ProviderError(`Cloud API ${code ?? response.status}: ${detail}`, retryable);
    }
    return { providerMessageId: data.messages[0].id };
  }
}

function platformConfig(): CloudConfig | null {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  return phoneNumberId && accessToken ? { phoneNumberId, accessToken } : null;
}

function restaurantConfig(integration: WhatsAppIntegration | null | undefined): CloudConfig | null {
  if (!integration?.enabled || integration.provider !== "CLOUD_API") return null;
  if (!integration.phoneNumberId || !integration.accessTokenEncrypted) return null;
  return { phoneNumberId: integration.phoneNumberId, accessToken: decryptSecret(integration.accessTokenEncrypted) };
}

/** qual provedor uma mensagem nova vai usar (fica gravado nela) */
export function activeProvider(integration?: WhatsAppIntegration | null): WhatsAppProvider {
  if (integration?.enabled && integration.provider === "CLOUD_API") return "CLOUD_API";
  return process.env.WHATSAPP_PROVIDER === "cloud_api" ? "CLOUD_API" : "MOCK";
}

export function clientFor(provider: WhatsAppProvider, integration?: WhatsAppIntegration | null): WhatsAppClient {
  if (provider === "MOCK") return new MockClient();
  const config = restaurantConfig(integration) ?? platformConfig();
  if (!config) throw new ProviderError("WhatsApp Cloud API não configurada (WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN).", false);
  return new CloudApiClient(config);
}
