// Descarta por completo lo que no viene de la hoja de 37 sabores: borra las
// 13 recetas que no estaban en la hoja (Piña-Coco, Naranja-Zanahoria, Piña
// Colada y las 10 de Café/Cafetería) y cualquier insumo que haya quedado sin
// ningún uso (ni en las 37 recetas ni en la base Arcy).
//
// Uso: node scripts/descartar_no_hoja.mjs [--dry-run]
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

if (!globalThis.WebSocket) globalThis.WebSocket = class {};

const envText = readFileSync(new URL("../.env", import.meta.url), "utf8");
const env = Object.fromEntries(
  envText.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; })
);
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const DRY_RUN = process.argv.includes("--dry-run");

const SABORES_HOJA = [
  "Mango", "Uva", "Maracuyá", "Kiwi", "Frutos Rojos", "Tamarindo", "Sandía", "Guayaba",
  "Limón, Chía y Menta", "Piña con Hierbabuena", "Fresa-Albahaca", "Jamaica-Romero",
  "Horchata de Agua", "Pepino-Limón-Chile", "Vainilla", "Chocolate", "Fresas con Crema",
  "Coco", "Arroz con Leche", "Nuez Pecana", "Cookies and Cream", "Taro", "Pistache",
  "Cheesecake", "Zarzamora con Philadelphia", "Menta Nevada", "Guanábana", "Mamey",
  "Mangonada Extrema", "Piña Loca", "Furia Tropical", "Sandía Brava", "Pica Limón",
  "Bomba de Tamarindo", "Skwinkles Mania", "Jícama-Limón-Chile", "Pepino-Tajín",
];

async function main() {
  const { data: libro, error } = await supabase.rpc("leer_libro");
  if (error) throw new Error("No se pudo leer el libro: " + error.message);
  console.log(`Libro actual: ${libro.insumos.length} insumos, ${libro.bases.length} bases, ${libro.recetas.length} recetas`);

  const faltan = SABORES_HOJA.filter((s) => !libro.recetas.find((r) => r.sabor === s));
  if (faltan.length) { console.log("❌ No encontradas, abortando:", faltan); process.exit(1); }

  const recetasFinal = libro.recetas.filter((r) => SABORES_HOJA.includes(r.sabor));
  const descartadas = libro.recetas.filter((r) => !SABORES_HOJA.includes(r.sabor));
  console.log(`\nRecetas a borrar (${descartadas.length}):`);
  descartadas.forEach((r) => console.log("  -", r.sabor));

  // insumos usados: por las 37 recetas + por los items de cada base que sobreviva
  const usados = new Set();
  recetasFinal.forEach((r) => r.items.forEach((it) => { if (it.tipo === "insumo") usados.add(it.refId); }));
  libro.bases.forEach((b) => b.items.forEach((it) => usados.add(it.insumoId)));

  const insumosFinal = libro.insumos.filter((i) => usados.has(i.id));
  const insumosDescartados = libro.insumos.filter((i) => !usados.has(i.id));
  console.log(`\nInsumos a borrar (${insumosDescartados.length}):`);
  insumosDescartados.forEach((i) => console.log("  -", i.nombre));

  console.log(`\nQuedarían: ${insumosFinal.length} insumos, ${libro.bases.length} bases, ${recetasFinal.length} recetas`);

  if (DRY_RUN) { console.log("\n[--dry-run] No se guardó nada."); return; }

  const payload = { ...libro, insumos: insumosFinal, recetas: recetasFinal };
  const { data: meta, error: errGuardar } = await supabase.rpc("guardar_libro", {
    payload, origen_cliente: "descartar-no-hoja-script",
  });
  if (errGuardar) throw new Error("No se pudo guardar: " + errGuardar.message);
  console.log("\n✅ Guardado:", meta);
}

main().catch((e) => { console.error(e); process.exit(1); });
