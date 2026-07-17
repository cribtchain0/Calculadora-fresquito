/* ────────────────────────────────────────────────────────────
   Capa de persistencia real — ahora contra Supabase (Postgres).
   Mismo contrato de siempre (leerLibro / guardarLibro /
   listarSnapshots / leerSnapshot) más suscribirLibro (Realtime),
   así el componente no tiene que saber qué backend hay detrás.
   Las tablas están normalizadas; las funciones RPC leer_libro /
   guardar_libro arman y desarman el libro completo en el servidor.
   ──────────────────────────────────────────────────────────── */

import { supabase } from "./supabase.js";

// Identifica esta pestaña para no recargar por sus propios guardados
const CLIENTE_ID = Math.random().toString(36).slice(2, 10);

export async function leerLibro() {
  const { data, error } = await supabase.rpc("leer_libro");
  if (error) throw new Error("No se pudo leer el libro");
  return data;
}

export async function guardarLibro(data) {
  const { data: meta, error } = await supabase.rpc("guardar_libro", {
    payload: data,
    origen_cliente: CLIENTE_ID,
  });
  if (error) throw new Error("No se pudo guardar el libro");
  return meta;
}

export async function listarSnapshots() {
  const { data, error } = await supabase.rpc("listar_snapshots");
  if (error) throw new Error("No se pudieron listar los respaldos");
  return data;
}

export async function leerSnapshot(id) {
  const { data, error } = await supabase.rpc("leer_snapshot", { pid: id });
  if (error || !data) throw new Error("No se pudo leer el respaldo");
  return data;
}

/* Avisa cuando otra persona guarda el libro desde otro dispositivo.
   Devuelve una función para cancelar la suscripción. */
export function suscribirLibro(onCambioAjeno) {
  const canal = supabase
    .channel("libro-cambios")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "libro_meta" },
      (msg) => {
        if (msg.new?.origen !== CLIENTE_ID) onCambioAjeno();
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(canal);
  };
}
