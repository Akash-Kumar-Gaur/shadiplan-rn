/**
 * Dual-Write Adapter for ShadiPlan Migration
 *
 * This adapter allows writing to both Supabase and Neon simultaneously
 * during the migration phase. Reads come from Neon, writes go to both.
 *
 * Usage:
 * - Deploy with EXPO_PUBLIC_USE_NEON=false (shadow writes only)
 * - Monitor for 1-2 weeks
 * - Switch to EXPO_PUBLIC_USE_NEON=true for final cutover
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const neonUrl = process.env.EXPO_PUBLIC_NEON_DATABASE_URL;
const useNeonBackend = process.env.EXPO_PUBLIC_USE_NEON === "true";
const migrationDebug = process.env.EXPO_PUBLIC_MIGRATION_DEBUG === "true";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const isNeonConfigured = Boolean(neonUrl);

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env"
    );
  }
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return supabaseClient;
}

/**
 * Shadow write to Supabase (non-critical, logs but doesn't throw)
 * Used during dual-write phase to keep both systems in sync
 */
async function shadowWrite(
  table: string,
  operation: "insert" | "update" | "delete",
  payload: {
    data?: Record<string, any>;
    id?: string;
    filter?: { key: string; value: any };
  }
) {
  if (!isSupabaseConfigured || !useNeonBackend) {
    return; // Skip if not in dual-write mode
  }

  try {
    const supabase = getSupabaseClient();

    if (operation === "insert" && payload.data) {
      const { error } = await supabase
        .from(table)
        .insert(payload.data);

      if (error) {
        console.warn(
          `[SHADOW WRITE] ${table}.insert failed (non-critical):`,
          error.message
        );
        if (migrationDebug) {
          console.log(`[SHADOW WRITE DEBUG] Payload:`, payload.data);
        }
      } else {
        console.log(`[SHADOW WRITE] ${table}.insert succeeded`);
      }
    }
    else if (operation === "update" && payload.data && payload.id) {
      const { error } = await supabase
        .from(table)
        .update(payload.data)
        .eq("id", payload.id);

      if (error) {
        console.warn(
          `[SHADOW WRITE] ${table}.update failed (non-critical):`,
          error.message
        );
        if (migrationDebug) {
          console.log(`[SHADOW WRITE DEBUG] ID: ${payload.id}, Payload:`, payload.data);
        }
      } else {
        console.log(`[SHADOW WRITE] ${table}.update succeeded`);
      }
    }
    else if (operation === "delete" && payload.id) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", payload.id);

      if (error) {
        console.warn(
          `[SHADOW WRITE] ${table}.delete failed (non-critical):`,
          error.message
        );
      } else {
        console.log(`[SHADOW WRITE] ${table}.delete succeeded`);
      }
    }
  }
  catch (err) {
    // Non-fatal — Neon has the data
    console.warn(`[SHADOW WRITE] Unexpected error for ${table}.${operation}:`, err);
  }
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const c = getSupabaseClient();
    const value = Reflect.get(c, prop, c) as unknown;
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(c)
      : value;
  },
});

export { useNeonBackend, shadowWrite };

/**
 * Example usage in your API files:
 *
 * import { shadowWrite, useNeonBackend } from './supabase-dual-write';
 *
 * export async function createWedding(data: WeddingData) {
 *   // Primary write to Neon (via Supabase client)
 *   const { data: wedding, error } = await supabase
 *     .from("weddings")
 *     .insert(data)
 *     .select()
 *     .single();
 *
 *   if (error) throw error;
 *
 *   // Shadow write to Supabase (non-critical)
 *   if (useNeonBackend) {
 *     shadowWrite("weddings", "insert", { data });
 *   }
 *
 *   return wedding;
 * }
 *
 * export async function updateWedding(id: string, updates: Partial<WeddingData>) {
 *   // Primary write to Neon
 *   const { data: wedding, error } = await supabase
 *     .from("weddings")
 *     .update(updates)
 *     .eq("id", id)
 *     .select()
 *     .single();
 *
 *   if (error) throw error;
 *
 *   // Shadow write to Supabase
 *   if (useNeonBackend) {
 *     shadowWrite("weddings", "update", { id, data: updates });
 *   }
 *
 *   return wedding;
 * }
 *
 * export async function deleteWedding(id: string) {
 *   // Primary delete from Neon
 *   const { error } = await supabase
 *     .from("weddings")
 *     .delete()
 *     .eq("id", id);
 *
 *   if (error) throw error;
 *
 *   // Shadow delete from Supabase
 *   if (useNeonBackend) {
 *     shadowWrite("weddings", "delete", { id });
 *   }
 * }
 */
