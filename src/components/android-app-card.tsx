"use client";

import { useEffect, useState } from "react";
import { BellRing, Download, RefreshCw, Smartphone } from "lucide-react";
import { getNativeStatus, NATIVE_RESCHEDULE_EVENT, NATIVE_STATUS_EVENT, type NativeStatus } from "./native-bridge";
import { Badge, Button, buttonClass, Card, CardHeader } from "./ui";

export const APK_DOWNLOAD_URL = "https://github.com/arsenal111294-web/billing-usage/releases/latest";

function isNativeApp(): boolean {
  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

/** Карточка Android-приложения: в браузере — ссылка на APK, в приложении — состояние уведомлений. */
export function AndroidAppCard() {
  const [native, setNative] = useState<boolean | null>(null);
  const [status, setStatus] = useState<NativeStatus | null>(null);

  useEffect(() => {
    // Платформу можно узнать только в браузере, после гидрации.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNative(isNativeApp());
    setStatus(getNativeStatus());
    const onStatus = (e: Event) => setStatus((e as CustomEvent<NativeStatus>).detail);
    window.addEventListener(NATIVE_STATUS_EVENT, onStatus);
    return () => window.removeEventListener(NATIVE_STATUS_EVENT, onStatus);
  }, []);

  if (native === null) return null;

  if (!native) {
    return (
      <Card>
        <CardHeader title="Приложение для Android" description="Уведомления о списаниях приходят прямо на телефон" />
        <div className="flex flex-col gap-3 text-sm text-ink-2">
          <p>
            Приложение показывает этот же сайт и само напоминает о списаниях, концах пробных периодов и исчерпанных лимитах — без
            Telegram и почты. Напоминания планируются на 90 дней вперёд и срабатывают даже без интернета.
          </p>
          <a href={APK_DOWNLOAD_URL} target="_blank" rel="noreferrer" className={buttonClass("primary", "sm") + " self-start"}>
            <Download className="size-4" aria-hidden />
            Скачать APK
          </a>
          <p className="text-xs text-muted">
            На странице релиза откройте файл <code>.apk</code> и разрешите установку из этого источника.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Уведомления на телефоне" description="Расписание обновляется при каждом открытии приложения" />
      <div className="flex flex-col gap-3 text-sm text-ink-2">
        {!status ? (
          <p className="text-muted">Проверяем разрешение…</p>
        ) : status.permission === "granted" ? (
          <p className="flex flex-wrap items-center gap-2">
            <Badge tone="good">
              <BellRing className="size-3.5" aria-hidden /> Включены
            </Badge>
            Запланировано: {status.scheduled} · обновлено в{" "}
            {new Date(status.updatedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
          </p>
        ) : (
          <p className="flex flex-wrap items-center gap-2">
            <Badge tone="critical">
              <Smartphone className="size-3.5" aria-hidden /> Выключены
            </Badge>
            Разрешите уведомления для Billing Tracker в настройках Android.
          </p>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={() => window.dispatchEvent(new Event(NATIVE_RESCHEDULE_EVENT))}
        >
          <RefreshCw className="size-4" aria-hidden />
          Обновить расписание
        </Button>
      </div>
    </Card>
  );
}
