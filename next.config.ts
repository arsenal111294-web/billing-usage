import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Секреты и ключи API используются только на сервере; клиенту ничего не отдаём.
  poweredByHeader: false,
  serverExternalPackages: [],
};

export default nextConfig;
