import { createHybridBrowserClient } from "./hybrid";

export const supabase = createHybridBrowserClient();

export { createClient } from './client';
export { useUser, useSupabaseAuth } from './hooks';
