import type { ProviderId } from "../types";
import { anthropicProvider } from "./anthropic";
import { manualProvider } from "./manual";
import { netlifyProvider } from "./netlify";
import { openaiProvider } from "./openai";
import { supabaseProvider } from "./supabase";
import type { ProviderDefinition, ProviderMeta } from "./types";

/** Реестр провайдеров. Чтобы добавить новый сервис — реализуйте ProviderDefinition и добавьте сюда. */
export const PROVIDERS: Record<ProviderId, ProviderDefinition> = {
  netlify: netlifyProvider,
  supabase: supabaseProvider,
  anthropic: anthropicProvider,
  openai: openaiProvider,
  manual: manualProvider,
};

export function getProvider(id: string): ProviderDefinition | null {
  return (PROVIDERS as Record<string, ProviderDefinition>)[id] ?? null;
}

/** Метаданные без функций — безопасно передавать в клиентские компоненты. */
export function providerCatalog(): ProviderMeta[] {
  return Object.values(PROVIDERS).map(({ id, name, description, docsUrl, fields }) => ({
    id,
    name,
    description,
    docsUrl,
    fields,
  }));
}

export type { ProviderDefinition, ProviderMeta, ProviderField } from "./types";
