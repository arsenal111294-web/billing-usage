import type { ProviderId, UsageSnapshot } from "../types";

export interface ProviderField {
  key: string;
  label: string;
  type: "password" | "text" | "number" | "select";
  /** Секретные поля шифруются и никогда не возвращаются в UI. */
  secret: boolean;
  required: boolean;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
}

/** Сериализуемое описание провайдера — можно передавать в клиентские компоненты. */
export interface ProviderMeta {
  id: ProviderId;
  name: string;
  description: string;
  docsUrl: string;
  fields: ProviderField[];
}

export interface FetchContext {
  secrets: Record<string, string>;
  config: Record<string, string>;
  fetch: typeof fetch;
  now: Date;
}

export interface ProviderDefinition extends ProviderMeta {
  fetchUsage(ctx: FetchContext): Promise<Omit<UsageSnapshot, "fetchedAt">>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
