/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// The project URL and anon key come from the environment (.env.local, which
// is gitignored). See .env.example. The app can share a Supabase project with
// other apps: every table it owns is cs_-prefixed.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (copy .env.example to .env.local).');
}

export const supabase = createClient(url, anonKey);
