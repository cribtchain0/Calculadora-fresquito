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

Ahorita `npm run dev` es solo para tu máquina. Para que la otra persona que
captura datos también entre desde su celular o compu, hay que:

1. Subir el backend a algún servidor (Railway, Render, un VPS chico, etc.)
   con un volumen persistente para `fresquito.db`.
2. Subir el frontend a donde sea (Vercel, Netlify, o el mismo servidor) y
   apuntar las llamadas `/api` al backend desplegado (ajustar
   `client/vite.config.js` o la URL base en `client/src/api.js`).

Esto no está hecho todavía — es el siguiente paso natural una vez que
confirmes que todo funciona bien en local.

## Modelo de datos y reglas de costeo

Ver los comentarios en `client/src/FresquitoFinanzas.jsx` — el árbol
Insumos → Bases → Paletas y las fórmulas de costeo (`costoUtil`,
`costoBaseTeorico`, `costoUnidadBase`, `costoReceta`) están documentados
inline, igual que antes.
