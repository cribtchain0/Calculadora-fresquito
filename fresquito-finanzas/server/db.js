import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.FRESQUITO_DB_PATH || path.join(__dirname, "fresquito.db");

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

// Una sola fila "viva" con el libro completo (mismo modelo de datos que ya
// usaba la app, para no tener que reescribir toda la lógica de costeo).
// Cada guardado también se apila en `snapshots`, así queda un historial
// real en disco por si algo se corrompe o el usuario borra algo sin querer.
db.exec(`
  CREATE TABLE IF NOT EXISTS libro (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL,
    actualizado_en TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL,
    creado_en TEXT NOT NULL
  );
`);

const MAX_SNAPSHOTS = 200;

export function leerLibro() {
  const row = db.prepare("SELECT data FROM libro WHERE id = 1").get();
  return row ? JSON.parse(row.data) : null;
}

export function guardarLibro(data) {
  const json = JSON.stringify(data);
  const ahora = new Date().toISOString();

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO libro (id, data, actualizado_en) VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data, actualizado_en = excluded.actualizado_en`
    ).run(json, ahora);

    db.prepare("INSERT INTO snapshots (data, creado_en) VALUES (?, ?)").run(json, ahora);

    // Poda snapshots viejos para que la base no crezca sin límite
    const count = db.prepare("SELECT COUNT(*) AS n FROM snapshots").get().n;
    if (count > MAX_SNAPSHOTS) {
      db.prepare(
        `DELETE FROM snapshots WHERE id IN (
           SELECT id FROM snapshots ORDER BY id ASC LIMIT ?
         )`
      ).run(count - MAX_SNAPSHOTS);
    }
  });
  tx();

  return { actualizado_en: ahora };
}

export function listarSnapshots(limit = 50) {
  return db
    .prepare("SELECT id, creado_en FROM snapshots ORDER BY id DESC LIMIT ?")
    .all(limit);
}

export function leerSnapshot(id) {
  const row = db.prepare("SELECT data, creado_en FROM snapshots WHERE id = ?").get(id);
  return row ? { data: JSON.parse(row.data), creado_en: row.creado_en } : null;
}
