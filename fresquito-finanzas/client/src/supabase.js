import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key || key.startsWith("PEGA_AQUI")) {
  throw new Error(
    "Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en client/.env " +
    "(la anon key está en el panel de Supabase → Settings → API keys)."
  );
}

export const supabase = createClient(url, key);
