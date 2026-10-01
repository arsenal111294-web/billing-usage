import type {
  IntegrationCreate,
  IntegrationPatch,
  IntegrationRecord,
  NotificationLogInput,
  Subscription,
  SubscriptionInput,
  UsageSnapshot,
} from "../types";

export interface Repository {
  readonly kind: "supabase" | "memory";

  listSubscriptions(): Promise<Subscription[]>;
  getSubscription(id: string): Promise<Subscription | null>;
  createSubscription(input: SubscriptionInput): Promise<Subscription>;
  updateSubscription(id: string, patch: Partial<SubscriptionInput>): Promise<Subscription>;
  deleteSubscription(id: string): Promise<void>;

  listIntegrations(): Promise<IntegrationRecord[]>;
  getIntegration(id: string): Promise<IntegrationRecord | null>;
  createIntegration(input: IntegrationCreate): Promise<IntegrationRecord>;
  updateIntegration(id: string, patch: IntegrationPatch): Promise<IntegrationRecord>;
  deleteIntegration(id: string): Promise<void>;
  addUsageSnapshot(integrationId: string, snapshot: UsageSnapshot): Promise<void>;

  /** Пытается записать уведомление; возвращает false, если такое уже было отправлено. */
  claimNotification(input: NotificationLogInput): Promise<boolean>;
  /** Откатывает запись, если отправка не удалась (чтобы повторить в следующий раз). */
  releaseNotification(dedupeKey: string): Promise<void>;
}
