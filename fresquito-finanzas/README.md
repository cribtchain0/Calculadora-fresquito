# Fresquito — Libro de finanzas, inventario y costeo

App para llevar las finanzas de Fresquito Gourmet Pops: gastos e ingresos,
insumos con merma, bases intermedias, recetas de paletas y su costeo
(Insumos → Bases → Paletas), gráficas, y ajustes.

El backend es **Supabase (Postgres)**: las dos personas pueden capturar
datos desde dispositivos distintos y ver el mismo estado, con
sincronización en tiempo real (si una guarda, la otra ve el cambio sin
recargar).

## Estructura

```
client/               Frontend Vite + React (el mismo componente de siempre)
supabase/migrations/  Esquema SQL del proyecto Supabase
server/               (legado) Antiguo backend Express + SQLite; solo queda
                      el script de migración y la base vieja como respaldo
```

## Cómo está guardado todo en Supabase

Tablas normalizadas: `insumos`, `bases`, `recetas`, `movimientos`,
`ajustes`, `activos`, `pasivos`, `proveedores`, `puntos_venta`, más
`snapshots` (respaldo automático de cada guardado, máx. 200) y
`libro_meta` (señal para la sincronización en tiempo real).

La app sigue trabajando con el "libro completo": las funciones RPC
`leer_libro()` y `guardar_libro(payload)` arman y desarman el JSON de
forma transaccional en el servidor. El cliente solo llama esas RPC
desde `client/src/api.js`.

**Seguridad:** por ahora el acceso es abierto (cualquiera con la URL y
la anon key puede leer/escribir). Cuando se quiera login, basta cambiar
las políticas RLS de `using (true)` a `to authenticated` en el panel de
Supabase y agregar una pantalla de acceso.

## Configurar la primera vez

1. Aplicar el esquema: pegar el contenido de
   `supabase/migrations/20260716120000_esquema_fresquito.sql` en el
   SQL Editor del panel de Supabase y ejecutarlo, y luego lo mismo con
   `supabase/migrations/20260720120000_activos_proveedores.sql` (en ese
   orden). Ambos son idempotentes.
2. Copiar `client/.env.example` a `client/.env` y llenar
   `VITE_SUPABASE_ANON_KEY` (panel de Supabase → Settings → API keys).
3. Instalar dependencias: `npm run install:all`
4. Si hay datos en la base SQLite vieja (`server/fresquito.db`),
   migrarlos una sola vez: `npm run migrar:supabase`

## Arrancar en desarrollo

```bash
npm run dev
```

Abre `http://localhost:5173` en el navegador. Ya no hay backend local
que levantar — el cliente habla directo con Supabase.

## Respaldos

- Cada guardado apila una copia completa del libro en la tabla
  `snapshots` (hasta 200 versiones). No hay UI para restaurar snapshots
  todavía — se pueden consultar con las RPC `listar_snapshots()` y
  `leer_snapshot(id)` desde el SQL Editor.
- Ajustes → Respaldo → **Descargar respaldo (JSON)** guarda el libro
  completo en un archivo que luego se puede volver a **Restaurar** desde
  ahí mismo. El CSV es solo para revisar en Excel — no se puede
  reimportar.

## Desplegar

El cliente es un sitio estático: `npm run build` y subir `client/dist`
a Vercel, Netlify o similar (configurando las mismas variables
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` en el build). No hace
falta servidor propio.

## Modelo de datos y reglas de costeo

Ver los comentarios en `client/src/FresquitoFinanzas.jsx` — el árbol
Insumos → Bases → Paletas y las fórmulas de costeo (`costoUtil`,
`costoBaseTeorico`, `costoUnidadBase`, `costoReceta`) están documentados
inline, igual que antes.
