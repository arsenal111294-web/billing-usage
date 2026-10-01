import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Android-оболочка Billing Tracker. Приложение открывает рабочий сайт (server.url),
 * поэтому обновления интерфейса приходят без переустановки APK. Нативная часть —
 * локальные уведомления о списаниях (src/components/native-bridge.tsx).
 */
const config: CapacitorConfig = {
  appId: "ru.billingtracker.app",
  appName: "Billing Tracker",
  // Показывается, только если сайт недоступен (нет интернета).
  webDir: "native-shell",
  server: {
    url: "https://billing-tracker-demo.netlify.app",
    androidScheme: "https",
    errorPath: "offline.html",
  },
  android: {
    backgroundColor: "#f6f6f4",
    appendUserAgent: "BillingTrackerApp",
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_notify",
      iconColor: "#2a78d6",
    },
  },
};

export default config;
