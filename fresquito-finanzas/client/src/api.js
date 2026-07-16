/* ────────────────────────────────────────────────────────────
   Capa de persistencia real (sustituye window.storage de Artifacts).
   Habla con el backend Express + SQLite en server/.
   ──────────────────────────────────────────────────────────── */

const BASE = "/api";

export async function leerLibro() {
  const r = await fetch(`${BASE}/libro`);
  if (!r.ok) throw new Error("No se pudo leer el libro");
  const { data } = await r.json();
  return data;
}

export async function guardarLibro(data) {
  const r = await fetch(`${BASE}/libro`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error("No se pudo guardar el libro");
  return r.json();
}

export async function listarSnapshots() {
  const r = await fetch(`${BASE}/snapshots`);
  if (!r.ok) throw new Error("No se pudieron listar los respaldos");
  const { snapshots } = await r.json();
  return snapshots;
}

export async function leerSnapshot(id) {
  const r = await fetch(`${BASE}/snapshots/${id}`);
  if (!r.ok) throw new Error("No se pudo leer el respaldo");
  return r.json();
}
