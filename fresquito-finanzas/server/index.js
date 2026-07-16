import express from "express";
import cors from "cors";
import {
  leerLibro,
  guardarLibro,
  listarSnapshots,
  leerSnapshot,
} from "./db.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// GET /api/libro — trae el estado actual completo (o null si nunca se ha guardado nada)
app.get("/api/libro", (req, res) => {
  try {
    const data = leerLibro();
    res.json({ data });
  } catch (err) {
    console.error("Error leyendo el libro:", err);
    res.status(500).json({ error: "No se pudo leer el libro" });
  }
});

// PUT /api/libro — guarda el estado completo (mismo patrón que window.storage.set)
app.put("/api/libro", (req, res) => {
  try {
    const data = req.body;
    if (!data || typeof data !== "object") {
      return res.status(400).json({ error: "Cuerpo inválido" });
    }
    const meta = guardarLibro(data);
    res.json({ ok: true, ...meta });
  } catch (err) {
    console.error("Error guardando el libro:", err);
    res.status(500).json({ error: "No se pudo guardar el libro" });
  }
});

// GET /api/snapshots — lista respaldos automáticos (para recuperar si algo se pierde)
app.get("/api/snapshots", (req, res) => {
  try {
    res.json({ snapshots: listarSnapshots() });
  } catch (err) {
    console.error("Error listando snapshots:", err);
    res.status(500).json({ error: "No se pudieron listar los respaldos" });
  }
});

// GET /api/snapshots/:id — trae un respaldo específico
app.get("/api/snapshots/:id", (req, res) => {
  try {
    const snap = leerSnapshot(Number(req.params.id));
    if (!snap) return res.status(404).json({ error: "Respaldo no encontrado" });
    res.json(snap);
  } catch (err) {
    console.error("Error leyendo snapshot:", err);
    res.status(500).json({ error: "No se pudo leer el respaldo" });
  }
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Servidor de Fresquito escuchando en http://localhost:${PORT}`);
});
