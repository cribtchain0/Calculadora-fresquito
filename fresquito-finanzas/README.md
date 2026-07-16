# Fresquito — Libro de finanzas, inventario y costeo

App para llevar las finanzas de Fresquito Gourmet Pops: gastos e ingresos,
insumos con merma, bases intermedias, recetas de paletas y su costeo
(Insumos → Bases → Paletas), gráficas, y ajustes.

Antes vivía como un artifact de Claude.ai con `window.storage`. Aquí corre
como una app normal: **React (Vite) + un backend Express con SQLite**, para
que la persistencia sea real e independiente del entorno donde se edite el
código — dos personas pueden capturar datos desde dispositivos distintos y
ver el mismo estado.

## Estructura

```
server/   Backend Express + SQLite (better-sqlite3)
client/   Frontend Vite + React (el mismo componente de siempre)
```

## Arrancar en desarrollo

Primera vez:

```bash
npm run install:all
```

Luego, para levantar backend y frontend juntos:

```bash
npm install        # solo la primera vez, instala "concurrently"
npm run dev
```

Esto deja:
- Backend en `http://localhost:3001`
- Frontend en `http://localhost:5173` (con proxy de `/api` hacia el backend)

Abre `http://localhost:5173` en el navegador.

Si prefieres correrlos por separado, en dos terminales:

```bash
npm run dev:server
npm run dev:client
```

## Dónde vive la base de datos

`server/fresquito.db` (SQLite, se crea sola la primera vez que guardas algo).
Está en `.gitignore` — no se sube al repo. **Haz respaldo de este archivo de
vez en cuando** (o usa el botón "Descargar respaldo (JSON)" dentro de la app,
en Ajustes → Respaldo).

Cada guardado también apila una copia en la tabla `snapshots` (hasta 200
versiones), como respaldo automático adicional por si algo se pierde o se
borra sin querer. No hay UI para restaurar snapshots todavía — se puede leer
directo de la base con `sqlite3 server/fresquito.db` o pedirle a Claude Code
que arme una pantalla para eso si hace falta.

## Respaldo manual (recomendado mientras agarras confianza)

Ajustes → Respaldo → **Descargar respaldo (JSON)** guarda el libro completo
en un archivo que luego se puede volver a **Restaurar** desde ahí mismo. El
CSV es solo para revisar en Excel — no se puede reimportar.

## Desplegar para que las dos personas lo usen desde cualquier lado

El backend (`server/index.js`) ya sirve el frontend compilado
(`client/dist`) desde el mismo puerto — un solo servicio, una sola URL,
sin CORS ni configuración de API base separada. Para producción:

```bash
npm run install:all
npm run build   # compila client/dist
npm start        # levanta el backend, que también sirve client/dist
```

### Desplegar en Render (recomendado)

El repo incluye `render.yaml` listo para usar:

1. En Render → **New** → **Blueprint**, conecta este repo.
2. Render lee `render.yaml` y crea un Web Service con:
   - `buildCommand: npm run install:all && npm run build`
   - `startCommand: npm start`
   - Un disco persistente de 1GB montado en `/data`, y
     `FRESQUITO_DB_PATH=/data/fresquito.db` para que la base sobreviva a
     reinicios y redeploys.
3. Requiere el plan **Starter** (~$7 USD/mes) — el plan free de Render no
   soporta discos persistentes, así que la base de datos se borraría en
   cada reinicio del servicio (duerme tras inactividad en free).
4. Al terminar el deploy, Render da una URL pública (`https://tu-app.onrender.com`)
   — ábrela desde cualquier celular o compu.

### Alternativas (Railway / Fly.io)

El mismo `buildCommand`/`startCommand` funciona en Railway o Fly.io con
ajustes mínimos:

- **Railway**: crea un servicio desde el repo, define `FRESQUITO_DB_PATH`
  apuntando a un volumen montado (Railway → Settings → Volumes), build
  command `npm run install:all && npm run build`, start command
  `npm start`. Cobra por uso, normalmente unos pocos dólares al mes para
  una app así de chica.
- **Fly.io**: requiere `flyctl` y un `fly.toml` con un volumen (`fly volumes
  create`), pero su tier gratuito incluye hasta 3GB de almacenamiento
  persistente, potencialmente sin costo. Menos plug-and-play que Render.

En cualquier caso, no olvides el respaldo manual (JSON) mientras agarras
confianza con la plataforma elegida.

## Modelo de datos y reglas de costeo

Ver los comentarios en `client/src/FresquitoFinanzas.jsx` — el árbol
Insumos → Bases → Paletas y las fórmulas de costeo (`costoUtil`,
`costoBaseTeorico`, `costoUnidadBase`, `costoReceta`) están documentados
inline, igual que antes.
