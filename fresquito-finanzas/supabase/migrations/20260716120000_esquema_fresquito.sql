-- ════════════════════════════════════════════════════════════
-- Fresquito — esquema en Supabase (Postgres)
-- Estructura normalizada: una tabla por entidad del libro.
-- El cliente sigue hablando en términos de "libro completo" a
-- través de las funciones RPC leer_libro() / guardar_libro(),
-- que arman y desarman el JSON de forma transaccional.
--
-- Se puede pegar tal cual en el SQL Editor del panel de Supabase.
-- Es idempotente: correrlo dos veces no rompe nada.
-- ════════════════════════════════════════════════════════════

-- ── Helpers de casteo tolerante ──────────────────────────────
-- El libro viejo guardaba algunos números como texto ("" incluido);
-- estas funciones convierten sin tronar.

create or replace function fq_num(t text)
returns numeric
language plpgsql immutable
set search_path = public
as $$
begin
  return coalesce(nullif(trim(t), '')::numeric, 0);
exception when others then
  return 0;
end $$;

create or replace function fq_bool(t text)
returns boolean
language plpgsql immutable
set search_path = public
as $$
begin
  return coalesce(nullif(trim(t), '')::boolean, false);
exception when others then
  return false;
end $$;

create or replace function fq_fecha(t text)
returns date
language plpgsql immutable
set search_path = public
as $$
begin
  return coalesce(nullif(trim(t), '')::date, current_date);
exception when others then
  return current_date;
end $$;

-- ── Tablas ───────────────────────────────────────────────────
-- `posicion` conserva el orden del arreglo original (la app muestra
-- los movimientos en orden de captura, el más nuevo primero).

create table if not exists insumos (
  id             text primary key,
  nombre         text not null,
  tipo           text not null default 'Otro',
  unidad         text not null default 'kg',
  merma          numeric not null default 0,
  stock          numeric not null default 0,
  stock_min      numeric not null default 0,
  costo_prom     numeric not null default 0,
  ultimo_costo   numeric not null default 0,
  precio_unit    numeric not null default 0,
  precio_mayoreo numeric not null default 0,
  lugar          text not null default '',
  notas          text not null default '',
  historial      jsonb not null default '[]', -- [{fecha, costo}], últimas 40 compras
  posicion       int not null default 0
);

create table if not exists bases (
  id         text primary key,
  nombre     text not null,
  unidad     text not null default 'L',
  rinde      numeric not null default 0,
  stock      numeric not null default 0,
  costo_prom numeric not null default 0,
  notas      text not null default '',
  items      jsonb not null default '[]', -- [{insumoId, cantidad}]
  posicion   int not null default 0
);

create table if not exists recetas (
  id             text primary key,
  sabor          text not null,
  linea          text not null default '',
  litros         numeric not null default 0,
  piezas         numeric not null default 0,
  precio_menudeo numeric not null default 0,
  precio_mayoreo numeric not null default 0,
  stock          numeric not null default 0,
  notas          text not null default '',
  items          jsonb not null default '[]', -- [{tipo: insumo|base, refId, cantidad}]
  posicion       int not null default 0
);

create table if not exists movimientos (
  id            text primary key,
  tipo          text not null check (tipo in ('gasto', 'ingreso')),
  fecha         date not null,
  monto         numeric not null default 0,
  categoria     text not null default '',
  canal         text not null default '',
  lugar         text not null default '',
  notas         text not null default '',
  insumo_id     text,            -- gasto ligado a compra de insumo
  cantidad      numeric not null default 0,
  mayoreo       boolean not null default false,
  recurrente    boolean not null default false,
  receta_id     text,            -- ingreso ligado a venta de paletas
  piezas        numeric not null default 0,
  capturado_por text not null default '',
  posicion      int not null default 0
);

create index if not exists movimientos_fecha_idx on movimientos (fecha);
create index if not exists movimientos_tipo_idx on movimientos (tipo);

create table if not exists ajustes (
  id               int primary key check (id = 1),
  molde_piezas     numeric not null default 40,
  ciclos_litros    numeric not null default 4.8,
  costos_fijos_mes numeric not null default 0,
  usuario          text not null default ''
);

-- Respaldo automático: cada guardado apila el libro completo (máx. 200).
create table if not exists snapshots (
  id        bigint generated always as identity primary key,
  data      jsonb not null,
  creado_en timestamptz not null default now()
);

-- Señal para Realtime: se toca en cada guardado; los otros
-- dispositivos se suscriben a esta tabla para recargar el libro.
create table if not exists libro_meta (
  id             int primary key check (id = 1),
  actualizado_en timestamptz not null default now(),
  origen         text not null default ''
);

-- ── Seguridad: RLS activo con acceso abierto (por ahora) ─────
-- Cuando quieran login, basta cambiar estas políticas a
-- `to authenticated` sin tocar nada más.

do $$
declare t text;
begin
  foreach t in array array['insumos','bases','recetas','movimientos','ajustes','snapshots','libro_meta'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists abierto_todo on %I', t);
    execute format('create policy abierto_todo on %I for all using (true) with check (true)', t);
  end loop;
end $$;

-- ── RPC: leer_libro ──────────────────────────────────────────
-- Devuelve el libro completo con la misma forma que la app espera.

create or replace function leer_libro()
returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'version', 3,
    'insumos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'nombre', nombre, 'tipo', tipo, 'unidad', unidad,
        'merma', merma, 'stock', stock, 'stockMin', stock_min,
        'costoProm', costo_prom, 'ultimoCosto', ultimo_costo,
        'precioUnit', precio_unit, 'precioMayoreo', precio_mayoreo,
        'lugar', lugar, 'notas', notas, 'historial', historial
      ) order by posicion) from insumos), '[]'::jsonb),
    'bases', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'nombre', nombre, 'unidad', unidad, 'rinde', rinde,
        'stock', stock, 'costoProm', costo_prom, 'notas', notas, 'items', items
      ) order by posicion) from bases), '[]'::jsonb),
    'recetas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'sabor', sabor, 'linea', linea, 'litros', litros,
        'piezas', piezas, 'precioMenudeo', precio_menudeo,
        'precioMayoreo', precio_mayoreo, 'stock', stock,
        'notas', notas, 'items', items
      ) order by posicion) from recetas), '[]'::jsonb),
    'movimientos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'tipo', tipo, 'fecha', to_char(fecha, 'YYYY-MM-DD'),
        'monto', monto, 'categoria', categoria, 'canal', canal,
        'lugar', lugar, 'notas', notas,
        'insumoId', coalesce(insumo_id, ''), 'cantidad', cantidad,
        'mayoreo', mayoreo, 'recurrente', recurrente,
        'recetaId', coalesce(receta_id, ''), 'piezas', piezas,
        'capturadoPor', capturado_por
      ) order by posicion) from movimientos), '[]'::jsonb),
    'ajustes', coalesce((
      select jsonb_build_object(
        'moldePiezas', molde_piezas, 'ciclosLitros', ciclos_litros,
        'costosFijosMes', costos_fijos_mes, 'usuario', usuario
      ) from ajustes where id = 1),
      jsonb_build_object('moldePiezas', 40, 'ciclosLitros', 4.8, 'costosFijosMes', 0, 'usuario', ''))
  )
$$;

-- ── RPC: guardar_libro ───────────────────────────────────────
-- Recibe el libro completo, sincroniza cada tabla (upsert por id +
-- borra lo que ya no está), apila snapshot y toca libro_meta.
-- Todo en una sola transacción.

create or replace function guardar_libro(payload jsonb, origen_cliente text default '')
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  ahora timestamptz := now();
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'Cuerpo inválido';
  end if;

  -- INSUMOS
  delete from insumos t where not exists (
    select 1 from jsonb_array_elements(coalesce(payload->'insumos', '[]'::jsonb)) e(v)
    where e.v->>'id' = t.id);
  insert into insumos (id, nombre, tipo, unidad, merma, stock, stock_min, costo_prom,
                       ultimo_costo, precio_unit, precio_mayoreo, lugar, notas, historial, posicion)
  select e.v->>'id', coalesce(e.v->>'nombre', ''), coalesce(e.v->>'tipo', 'Otro'),
         coalesce(e.v->>'unidad', 'kg'), fq_num(e.v->>'merma'), fq_num(e.v->>'stock'),
         fq_num(e.v->>'stockMin'), fq_num(e.v->>'costoProm'), fq_num(e.v->>'ultimoCosto'),
         fq_num(e.v->>'precioUnit'), fq_num(e.v->>'precioMayoreo'),
         coalesce(e.v->>'lugar', ''), coalesce(e.v->>'notas', ''),
         coalesce(e.v->'historial', '[]'::jsonb), e.ord
  from jsonb_array_elements(coalesce(payload->'insumos', '[]'::jsonb)) with ordinality e(v, ord)
  where coalesce(e.v->>'id', '') <> ''
  on conflict (id) do update set
    nombre = excluded.nombre, tipo = excluded.tipo, unidad = excluded.unidad,
    merma = excluded.merma, stock = excluded.stock, stock_min = excluded.stock_min,
    costo_prom = excluded.costo_prom, ultimo_costo = excluded.ultimo_costo,
    precio_unit = excluded.precio_unit, precio_mayoreo = excluded.precio_mayoreo,
    lugar = excluded.lugar, notas = excluded.notas,
    historial = excluded.historial, posicion = excluded.posicion;

  -- BASES
  delete from bases t where not exists (
    select 1 from jsonb_array_elements(coalesce(payload->'bases', '[]'::jsonb)) e(v)
    where e.v->>'id' = t.id);
  insert into bases (id, nombre, unidad, rinde, stock, costo_prom, notas, items, posicion)
  select e.v->>'id', coalesce(e.v->>'nombre', ''), coalesce(e.v->>'unidad', 'L'),
         fq_num(e.v->>'rinde'), fq_num(e.v->>'stock'), fq_num(e.v->>'costoProm'),
         coalesce(e.v->>'notas', ''), coalesce(e.v->'items', '[]'::jsonb), e.ord
  from jsonb_array_elements(coalesce(payload->'bases', '[]'::jsonb)) with ordinality e(v, ord)
  where coalesce(e.v->>'id', '') <> ''
  on conflict (id) do update set
    nombre = excluded.nombre, unidad = excluded.unidad, rinde = excluded.rinde,
    stock = excluded.stock, costo_prom = excluded.costo_prom,
    notas = excluded.notas, items = excluded.items, posicion = excluded.posicion;

  -- RECETAS
  delete from recetas t where not exists (
    select 1 from jsonb_array_elements(coalesce(payload->'recetas', '[]'::jsonb)) e(v)
    where e.v->>'id' = t.id);
  insert into recetas (id, sabor, linea, litros, piezas, precio_menudeo, precio_mayoreo,
                       stock, notas, items, posicion)
  select e.v->>'id', coalesce(e.v->>'sabor', ''), coalesce(e.v->>'linea', ''),
         fq_num(e.v->>'litros'), fq_num(e.v->>'piezas'), fq_num(e.v->>'precioMenudeo'),
         fq_num(e.v->>'precioMayoreo'), fq_num(e.v->>'stock'),
         coalesce(e.v->>'notas', ''), coalesce(e.v->'items', '[]'::jsonb), e.ord
  from jsonb_array_elements(coalesce(payload->'recetas', '[]'::jsonb)) with ordinality e(v, ord)
  where coalesce(e.v->>'id', '') <> ''
  on conflict (id) do update set
    sabor = excluded.sabor, linea = excluded.linea, litros = excluded.litros,
    piezas = excluded.piezas, precio_menudeo = excluded.precio_menudeo,
    precio_mayoreo = excluded.precio_mayoreo, stock = excluded.stock,
    notas = excluded.notas, items = excluded.items, posicion = excluded.posicion;

  -- MOVIMIENTOS
  delete from movimientos t where not exists (
    select 1 from jsonb_array_elements(coalesce(payload->'movimientos', '[]'::jsonb)) e(v)
    where e.v->>'id' = t.id);
  insert into movimientos (id, tipo, fecha, monto, categoria, canal, lugar, notas,
                           insumo_id, cantidad, mayoreo, recurrente, receta_id, piezas,
                           capturado_por, posicion)
  select e.v->>'id',
         case when e.v->>'tipo' = 'ingreso' then 'ingreso' else 'gasto' end,
         fq_fecha(e.v->>'fecha'), fq_num(e.v->>'monto'),
         coalesce(e.v->>'categoria', ''), coalesce(e.v->>'canal', ''),
         coalesce(e.v->>'lugar', ''), coalesce(e.v->>'notas', ''),
         nullif(e.v->>'insumoId', ''), fq_num(e.v->>'cantidad'),
         fq_bool(e.v->>'mayoreo'), fq_bool(e.v->>'recurrente'),
         nullif(e.v->>'recetaId', ''), fq_num(e.v->>'piezas'),
         coalesce(e.v->>'capturadoPor', ''), e.ord
  from jsonb_array_elements(coalesce(payload->'movimientos', '[]'::jsonb)) with ordinality e(v, ord)
  where coalesce(e.v->>'id', '') <> ''
  on conflict (id) do update set
    tipo = excluded.tipo, fecha = excluded.fecha, monto = excluded.monto,
    categoria = excluded.categoria, canal = excluded.canal, lugar = excluded.lugar,
    notas = excluded.notas, insumo_id = excluded.insumo_id, cantidad = excluded.cantidad,
    mayoreo = excluded.mayoreo, recurrente = excluded.recurrente,
    receta_id = excluded.receta_id, piezas = excluded.piezas,
    capturado_por = excluded.capturado_por, posicion = excluded.posicion;

  -- AJUSTES (una sola fila)
  insert into ajustes (id, molde_piezas, ciclos_litros, costos_fijos_mes, usuario)
  values (1,
    fq_num(payload->'ajustes'->>'moldePiezas'),
    fq_num(payload->'ajustes'->>'ciclosLitros'),
    fq_num(payload->'ajustes'->>'costosFijosMes'),
    coalesce(payload->'ajustes'->>'usuario', ''))
  on conflict (id) do update set
    molde_piezas = excluded.molde_piezas, ciclos_litros = excluded.ciclos_litros,
    costos_fijos_mes = excluded.costos_fijos_mes, usuario = excluded.usuario;

  -- SNAPSHOT + poda (máx. 200)
  insert into snapshots (data, creado_en) values (payload, ahora);
  delete from snapshots where id in (
    select id from snapshots order by id desc offset 200);

  -- Señal para Realtime
  insert into libro_meta (id, actualizado_en, origen)
  values (1, ahora, coalesce(origen_cliente, ''))
  on conflict (id) do update set
    actualizado_en = excluded.actualizado_en, origen = excluded.origen;

  return jsonb_build_object('ok', true, 'actualizado_en', ahora);
end $$;

-- ── RPC: snapshots ───────────────────────────────────────────

create or replace function listar_snapshots(lim int default 50)
returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object('id', id, 'creado_en', creado_en) order by id desc),
    '[]'::jsonb)
  from (select id, creado_en from snapshots order by id desc limit lim) t
$$;

create or replace function leer_snapshot(pid bigint)
returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('data', data, 'creado_en', creado_en)
  from snapshots where id = pid
$$;

-- ── Realtime: publicar cambios de libro_meta ─────────────────

do $$
begin
  alter publication supabase_realtime add table libro_meta;
exception when duplicate_object then
  null; -- ya estaba publicada
end $$;
