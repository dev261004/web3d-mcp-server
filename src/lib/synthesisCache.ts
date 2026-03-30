import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CACHE_DIR = join(process.cwd(), ".synthesis_cache");
const CACHE_FILE = join(CACHE_DIR, "geometry_cache.json");

export interface CacheEntry {
  jsx: string;
  object_name: string;
  category: string;
  style: string;
  material_preset: string;
  accent_color: string;
  created_at: string;
  hit_count: number;
}

type CacheStore = Record<string, CacheEntry>;

function loadCache(): CacheStore {
  if (!existsSync(CACHE_FILE)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(CACHE_FILE, "utf-8")) as CacheStore;
  } catch {
    return {};
  }
}

function saveCache(store: CacheStore): void {
  try {
    if (!existsSync(CACHE_DIR)) {
      mkdirSync(CACHE_DIR, { recursive: true });
    }
    writeFileSync(CACHE_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("[synthesisCache] Failed to write cache:", err);
    // Don't throw — cache failure should never crash the MCP server
  }
}

export function buildCacheKey(params: {
  objectName: string;
  style: string;
  materialPreset: string;
  accentColor: string;
}): string {
  const raw = [
    params.objectName.toLowerCase().trim(),
    params.style.toLowerCase(),
    params.materialPreset.toLowerCase(),
    params.accentColor.toLowerCase()
  ].join("|");

  return createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

export function getCachedGeometry(key: string): string | null {
  const store = loadCache();
  const entry = store[key];

  if (!entry) {
    return null;
  }

  entry.hit_count += 1;
  saveCache(store);
  return entry.jsx;
}

export function setCachedGeometry(
  key: string,
  entry: Omit<CacheEntry, "hit_count" | "created_at">
): void {
  const store = loadCache();

  store[key] = {
    ...entry,
    hit_count: 0,
    created_at: new Date().toISOString()
  };

  saveCache(store);
}

export function getCacheStats(): {
  total_entries: number;
  total_hits: number;
  entries: Array<{ object_name: string; style: string; hits: number }>;
} {
  const store = loadCache();
  const entries = Object.values(store);

  return {
    total_entries: entries.length,
    total_hits: entries.reduce((sum, entry) => sum + entry.hit_count, 0),
    entries: entries.map((entry) => ({
      object_name: entry.object_name,
      style: entry.style,
      hits: entry.hit_count
    }))
  };
}
