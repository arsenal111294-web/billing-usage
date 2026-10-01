import "server-only";
import { env, isDemoMode } from "../env";
import { MemoryRepository } from "./memory";
import type { Repository } from "./repository";
import { SupabaseRepository } from "./supabase";

let cached: { key: string; repo: Repository } | null = null;

export function getRepository(): Repository {
  const key = isDemoMode() ? "memory" : `${env.supabaseUrl}`;
  if (cached?.key === key) return cached.repo;
  const repo = isDemoMode() ? new MemoryRepository() : new SupabaseRepository(env.supabaseUrl!, env.supabaseServiceKey!);
  cached = { key, repo };
  return repo;
}

export type { Repository };
