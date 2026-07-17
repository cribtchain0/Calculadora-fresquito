/* ────────────────────────────────────────────────────────────
   Migración única: SQLite local → Supabase.
   Lee el libro de server/fresquito.db y lo sube con la RPC
   guardar_libro (que lo reparte en las tablas normalizadas).

   Requisitos: client/.env con la anon key ya llenada y el
   esquema SQL ya aplicado en Supabase.

   Uso (desde la raíz del proyecto):
     npm run migrar:supabase
   ──────────────────────────────────────────────────────────── */

import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Toma URL y anon key del .env del cliente para no duplicar config
const envPath = path.join(__dirname, "..", "client", ".env");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const URL_SUPABASE = env.VITE_SUPABASE_URL;
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!URL_SUPABASE || !ANON_KEY || ANON_KEY.startsWith("PEGA_AQUI")) {
  console.error("Primero llena la anon key en client/.env (panel de Supabase → Settings → API keys).");
  process.exit(1);
}

const db = new Database(path.join(__dirname, "fresquito.db"), { readonly: true });
const row = db.prepare("SELECT data FROM libro WHERE id = 1").get();
if (!row) {
  console.log("La base local no tiene datos guardados; no hay nada que migrar.");
  process.exit(0);
}
const payload = JSON.parse(row.data);

const r = await fetch(`${URL_SUPABASE}/rest/v1/rpc/guardar_libro`, {
  method: "POST",
  headers: {
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ payload, origen_cliente: "migracion-sqlite" }),
});

if (!r.ok) {
  console.error(`Falló la migración (HTTP ${r.status}):`, await r.text());
  process.exit(1);
}

console.log("Libro migrado a Supabase:");
console.log(`  · ${payload.movimientos?.length || 0} movimientos`);
console.log(`  · ${payload.insumos?.length || 0} insumos`);
console.log(`  · ${payload.bases?.length || 0} bases`);
console.log(`  · ${payload.recetas?.length || 0} recetas`);
console.log("Verifica en la app y en el panel de Supabase (Table Editor).");
