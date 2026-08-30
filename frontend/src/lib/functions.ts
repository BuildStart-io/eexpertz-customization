/**
 * Helper to resolve edge function names with customization suffix
 */
export const CUSTOMIZATION_SUFFIX = import.meta.env.VITE_CUSTOMIZATION_SUFFIX ?? "-eexpertz";

export function getFunctionName(name: string): string {
  return `${name}${CUSTOMIZATION_SUFFIX}`;
}

export function getFunctionUrl(name: string): string {
  const baseUrl = (import.meta.env.VITE_SUPABASE_URL || "https://supabase.buildstart.io").replace(/\/+$/, "");
  return `${baseUrl}/functions/v1/${getFunctionName(name)}`;
}
