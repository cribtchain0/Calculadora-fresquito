// Importa las 37 recetas curadas por el usuario en Google Sheets, mapeando
// cada ingrediente al catálogo de insumos ya existente en Supabase (el mismo
// que carga el botón "Cargar catálogo" de Ajustes). Deja intactas las 13
// recetas que el usuario todavía no revisa (Piña-Coco, Naranja-Zanahoria,
// Piña Colada y toda la línea Café/Cafetería) y sus insumos exclusivos.
//
// Uso: node scripts/importar_hoja.mjs [--dry-run]
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Este script solo usa RPC (fetch), no Realtime — evita que supabase-js
// truene en Node < 22 por falta de WebSocket nativo al inicializar.
if (!globalThis.WebSocket) globalThis.WebSocket = class {};

const envText = readFileSync(new URL("../.env", import.meta.url), "utf8");
const env = Object.fromEntries(
  envText.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; })
);
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const DRY_RUN = process.argv.includes("--dry-run");
const RECETAS_CSV = "C:\\Users\\ENRIQU~1\\AppData\\Local\\Temp\\fresquito_now_Recetas.csv";

const uid = () => Math.random().toString(36).slice(2, 10);

// ── parseo CSV mínimo (soporta comillas, sin saltos de línea dentro de campo) ──
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  return lines.map((line) => {
    const out = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQ = false;
        else cur += c;
      } else if (c === '"') inQ = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out;
  });
}

const rows = parseCSV(readFileSync(RECETAS_CSV, "utf8")).slice(1); // sin encabezado
// columnas: #, Receta, Línea, Insumo, Cantidad, Unidad, Tipo, Nota

// ── mapeo nombre-hoja -> nombre-catálogo-existente ──────────────────────────
// Casos sin ambigüedad (mismo insumo en cualquier receta):
const MAPA_DIRECTO = {
  "mango": "Mango Ataulfo",
  "Pulpa de mango Ataulfo": "Mango Ataulfo",
  "Jugo de limón": "Jugo de limón",
  "Agua purificada": "Agua purificada",
  "Azúcar": "Azúcar",
  "Esencia natural de uva": "Esencia de uva",
  "maracuyá": "Maracuyá",
  "Kiwi": "Kiwi",
  "Mix frutos rojos congelados": "Mix frutos rojos congelados",
  "Jugo de arándano natural sin azúcar": "Jugo de arándano natural",
  "tamarindo": "Pasta de tamarindo concentrada",
  "Sandía": "Sandía sin semilla",
  "Guayaba rosa madura": "Guayaba rosa",
  "Canela en polvo": "Canela en polvo",
  "Hojas de menta fresca": "Hojas de menta fresca",
  "Semillas de chía": "Semillas de chía",
  "Piña": "Piña miel",
  "Hojas de hierbabuena fresca": "Hierbabuena fresca",
  "Fresa fresca": "Fresa",
  "Hojas de albahaca Genovesa": "Albahaca genovesa",
  "Flor de Jamaica seca": "Flor de jamaica seca",
  "Ramas de romero fresco": "Romero fresco",
  "Canela en raja": "Canela en raja",
  "Pepino": "Pepino",
  "Tajín Clásico": "Tajín Clásico",
  "Tajín Habanero": "Tajín Habanero",
  "Cocoa alcalina": "Cocoa alcalina",
  "Sal fina": "Sal fina",
  "Crema de coco comercial (Calahua)": "Crema de coco Calahua",
  "Esencia de coco": "Esencia de coco",
  "Coco rallado": "Coco rallado",
  "Piña en almíbar (cubitos)": "Piña en almíbar",
  "Nuez pecana tostada": "Nuez pecana",
  "Galletas Oreo": "Galletas Oreo",
  "Polvo de Taro (bubble tea)": "Polvo de taro",
  "Pistaches naturales pelados": "Pistache natural pelado",
  "Extracto de almendra": "Extracto de almendra",
  "Queso crema Philadelphia": "Queso crema Philadelphia",
  "Galleta Graham o María triturada": "Galleta Graham o María",
  "Zarzamoras naturales o congeladas": "Zarzamora",
  "Esencia pura de menta blanca": "Esencia de menta blanca",
  "chocolate": "Chispas de chocolate cobertura",
  "Colorante verde menta": "Colorante verde menta",
  "guanábana": "Guanábana",
  "mamey": "Mamey",
  "Saborizante de mango o tamarindo": "Saborizante de mango o tamarindo",
  "Skwinkles Salsagheti (tiras)": "Skwinkles Salsagheti",
  "Jícama": "Jícama",
  "Chile piquín molido": "Chile piquín molido",
  "Ralladura de limón": "Ralladura de limón", // insumo nuevo, se crea abajo
};

// Casos que dependen de la receta:
const MAPA_POR_RECETA = {
  "Horchata de Agua|Arroz": "Arroz grano largo",
  "Arroz con Leche|Arroz": "Arroz grano corto",
  "Fresas con Crema|Mermelada": "Mermelada de fresa espesa",
  "Cheesecake|Mermelada": "Mermelada de fresa espesa",
  "Zarzamora con Philadelphia|Mermelada": "Mermelada horneable de frutos rojos",
  "Skwinkles Mania|Chamoy": "Chamoy El Chilerito",
  // el resto de "Chamoy" en recetas Picosas → Chamoy Mega (regla por defecto abajo)
  "Vainilla|Vainilla": "Pasta concentrada de vainilla", // única receta que NO usa extracto
};
const CHAMOY_DEFECTO = "Chamoy Mega";
const VAINILLA_EXTRACTO = "Extracto de vainilla oscura";

// La única referencia a "Base Arcy Crema (VIC) preparada" → es la BASE, no insumo
const NOMBRE_BASE_ARCY = "Base Arcy Crema (VIC)";

const UNIDAD_HOJA_A_APP = { kg: "kg", g: "g", L: "L", mL: "ml" };

// Mermas a actualizar con el valor (más reciente) de la hoja — solo insumos
// que no comparten receta con las 13 que el usuario no está tocando todavía.
const MERMAS_ACTUALIZADAS = {
  "Kiwi": 15,
  "Jícama": 15,
  "Pepino": 8,
  "Mamey": 40,
  "Guanábana": 35,
  "Guayaba rosa": 8,
  "Mix frutos rojos congelados": 5,
  "Fresa": 6,
  "Mango Ataulfo": 35,
};

function resolverNombreInsumo(receta, insumoHoja) {
  const clave = `${receta}|${insumoHoja}`;
  if (MAPA_POR_RECETA[clave]) return MAPA_POR_RECETA[clave];
  if (insumoHoja === "Chamoy") return CHAMOY_DEFECTO;
  if (insumoHoja === "Vainilla") return VAINILLA_EXTRACTO;
  if (MAPA_DIRECTO[insumoHoja]) return MAPA_DIRECTO[insumoHoja];
  return null; // sin mapeo -> error, se reporta
}

async function main() {
  const { data: libro, error } = await supabase.rpc("leer_libro");
  if (error) throw new Error("No se pudo leer el libro: " + error.message);

  console.log(`Libro actual: ${libro.insumos.length} insumos, ${libro.bases.length} bases, ${libro.recetas.length} recetas`);

  const insumoIdPorNombre = new Map(libro.insumos.map((i) => [i.nombre, i]));
  const baseIdPorNombre = new Map(libro.bases.map((b) => [b.nombre, b]));
  const recetaPorSabor = new Map(libro.recetas.map((r) => [r.sabor, r]));

  // ── agrupar filas de la hoja por receta ──
  const porReceta = new Map(); // sabor -> { linea, filas: [] }
  for (const row of rows) {
    const [, sabor, linea, insumo, cantidad, unidad, , nota] = row;
    if (!sabor) continue;
    if (!porReceta.has(sabor)) porReceta.set(sabor, { linea, filas: [] });
    porReceta.get(sabor).filas.push({ insumo, cantidad: Number(cantidad), unidad, nota });
  }

  console.log(`\nHoja: ${porReceta.size} sabores`);

  // ── insumo nuevo: Ralladura de limón ──
  let nuevoInsumo = null;
  if (!insumoIdPorNombre.has("Ralladura de limón")) {
    nuevoInsumo = {
      id: uid(), nombre: "Ralladura de limón", tipo: "Fruta", unidad: "pieza",
      merma: 0, stock: 0, stockMin: 0, costoProm: 0, ultimoCosto: 0,
      precioUnit: 0, precioMayoreo: 0, lugar: "", notas: "", historial: [],
    };
    insumoIdPorNombre.set(nuevoInsumo.nombre, nuevoInsumo);
    console.log(`\n+ Insumo nuevo: ${nuevoInsumo.nombre} (${nuevoInsumo.unidad})`);
  }

  // ── recetas: construir items + notas nuevos ──
  const erroresMapeo = [];
  const sinCoincidencia = [];
  const recetasActualizadas = [];

  for (const [sabor, { filas }] of porReceta) {
    const receta = recetaPorSabor.get(sabor);
    if (!receta) { sinCoincidencia.push(sabor); continue; }

    const items = [];
    const notas = [];
    for (const fila of filas) {
      if (fila.insumo === "Base Arcy Crema (VIC) preparada") {
        const b = baseIdPorNombre.get(NOMBRE_BASE_ARCY);
        if (!b) { erroresMapeo.push(`${sabor}: base "${NOMBRE_BASE_ARCY}" no existe`); continue; }
        items.push({ tipo: "base", refId: b.id, cantidad: fila.cantidad, unidad: fila.unidad === "L" ? undefined : UNIDAD_HOJA_A_APP[fila.unidad] });
      } else {
        const nombreDestino = resolverNombreInsumo(sabor, fila.insumo);
        if (!nombreDestino) { erroresMapeo.push(`${sabor}: sin mapeo para "${fila.insumo}"`); continue; }
        const ins = insumoIdPorNombre.get(nombreDestino);
        if (!ins) { erroresMapeo.push(`${sabor}: insumo destino "${nombreDestino}" no existe en catálogo`); continue; }
        const unidadApp = UNIDAD_HOJA_A_APP[fila.unidad];
        const unidadItem = unidadApp && unidadApp !== ins.unidad ? unidadApp : undefined;
        items.push({ tipo: "insumo", refId: ins.id, cantidad: fila.cantidad, unidad: unidadItem });
      }
      if (fila.nota && fila.nota.trim()) notas.push(`${fila.insumo}: ${fila.nota.trim()}`);
    }

    recetasActualizadas.push({
      ...receta,
      items,
      notas: notas.join(" · "),
    });
  }

  if (sinCoincidencia.length) {
    console.log("\n⚠️ Sabores de la hoja sin receta correspondiente en el libro (no se tocan):");
    sinCoincidencia.forEach((s) => console.log("  -", s));
  }
  if (erroresMapeo.length) {
    console.log("\n❌ Errores de mapeo (deteniendo, nada se guarda):");
    erroresMapeo.forEach((e) => console.log("  -", e));
    process.exit(1);
  }

  console.log(`\n${recetasActualizadas.length} recetas se van a reemplazar (items + notas):`);
  recetasActualizadas.forEach((r) => console.log(`  - ${r.sabor} (${r.items.length} ingredientes)`));

  // ── aplicar mermas actualizadas ──
  const insumosFinal = libro.insumos.map((i) => {
    if (MERMAS_ACTUALIZADAS[i.nombre] !== undefined && MERMAS_ACTUALIZADAS[i.nombre] !== i.merma) {
      console.log(`\nMerma ${i.nombre}: ${i.merma}% -> ${MERMAS_ACTUALIZADAS[i.nombre]}%`);
      return { ...i, merma: MERMAS_ACTUALIZADAS[i.nombre] };
    }
    return i;
  });
  if (nuevoInsumo) insumosFinal.push(nuevoInsumo);

  const idsActualizados = new Set(recetasActualizadas.map((r) => r.id));
  const recetasFinal = libro.recetas.map((r) => {
    const nueva = recetasActualizadas.find((x) => x.id === r.id);
    return nueva || r;
  });

  const payload = { ...libro, insumos: insumosFinal, recetas: recetasFinal };

  if (DRY_RUN) {
    console.log("\n[--dry-run] No se guardó nada. Recetas de muestra:");
    for (const nombre of ["Vainilla", "Skwinkles Mania", "Furia Tropical"]) {
      const r = recetasActualizadas.find((x) => x.sabor === nombre);
      const conNombres = { ...r, items: r.items.map((it) => ({
        ...it,
        nombre: it.tipo === "base" ? [...baseIdPorNombre].find(([, b]) => b.id === it.refId)?.[0]
          : [...insumoIdPorNombre].find(([, i]) => i.id === it.refId)?.[0],
      })) };
      console.log(JSON.stringify(conNombres, null, 2));
    }
    return;
  }

  const { data: meta, error: errGuardar } = await supabase.rpc("guardar_libro", {
    payload,
    origen_cliente: "import-hoja-script",
  });
  if (errGuardar) throw new Error("No se pudo guardar: " + errGuardar.message);
  console.log("\n✅ Guardado:", meta);
}

main().catch((e) => { console.error(e); process.exit(1); });
