-- ════════════════════════════════════════════════════════════
-- Fresquito — activos/pasivos, proveedores/puntos de venta y
-- mermas de insumos, más columnas que el código ya usaba
-- (compra por paquete, producción real) pero que la migración
-- inicial nunca agregó.
--
-- Se puede pegar tal cual en el SQL Editor del panel de Supabase,
-- después de la migración 20260716120000. Es idempotente.
-- ════════════════════════════════════════════════════════════

-- ── Helper: fecha opcional tolerante (a diferencia de fq_fecha, aquí
-- "vacío o inválido" es NULL de verdad, no "hoy") ────────────────

create or replace function fq_fecha_ok(t text)
returns date
language plpgsql immutable
set search_path = public
as $$
begin
  return nullif(trim(t), '')::date;
exception when others then
  return null;
end $$;

-- ── Columnas que el cliente ya usa (compra por paquete, producción
-- real por corrida) pero que nunca llegaron a esta migración ────

alter table insumos add column if not exists por_paquete boolean not null default false;
alter table insumos add column if not exists unidades_por_paquete numeric not null default 0;
alter table insumos add column if not exists nombre_paquete text not null default '';
alter table recetas add column if not exists producciones jsonb not null default '[]';

-- ── Mermas de insumos: por qué bajó la existencia además de compras
-- y producción (se echó a perder, se desconoce, otro motivo) ────

alter table insumos add column if not exists mermas jsonb not null default '[]';

-- ── Tablas nuevas ────────────────────────────────────────────

create table if not exists activos (
  id        text primary key,
  nombre    text not null default '',
  categoria text not null default 'Otro',
  valor     numeric not null default 0,
  fecha     date not null default current_date,
  notas     text not null default '',
  posicion  int not null default 0
);

create table if not exists pasivos (
  id           text primary key,
  nombre       text not null default '',
  categoria    text not null default 'Otro',
  monto        numeric not null default 0,
  fecha        date not null default current_date,
  fecha_limite date,
  notas        text not null default '',
  posicion     int not null default 0
);

-- A quién le compramos: lo que les debemos (adeudo) y bitácora de
-- compras/pagos.
create table if not exists proveedores (
  id        text primary key,
  nombre    text not null default '',
  ubicacion text not null default '',
  adeudo    numeric not null default 0,
  notas     text not null default '',
  eventos   jsonb not null default '[]', -- [{id, fecha, tipo: compra|pago, monto, notas}]
  posicion  int not null default 0
);

-- A quién le surtimos: lo que nos deben (adeudo) y bitácora de
-- entregas/cobros.
create table if not exists puntos_venta (
  id        text primary key,
  nombre    text not null default '',
  ubicacion text not null default '',
  adeudo    numeric not null default 0,
  notas     text not null default '',
  eventos   jsonb not null default '[]', -- [{id, fecha, tipo: entrega|cobro, monto, notas}]
  posicion  int not null default 0
);

-- ── Seguridad: mismo acceso abierto que el resto (por ahora) ─────

do $$
declare t text;
begin
  foreach t in array array['activos','pasivos','proveedores','puntos_venta'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists abierto_todo on %I', t);
    execute format('create policy abierto_todo on %I for all using (true) with check (true)', t);
  end loop;
end $$;

-- ── RPC: leer_libro (reemplazo completo) ─────────────────────
-- Mismo contrato que antes + los campos que faltaban + las 4
-- colecciones nuevas.

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
        'lugar', lugar, 'notas', notas, 'historial', historial,
        'porPaquete', por_paquete, 'unidadesPorPaquete', unidades_por_paquete,
        'nombrePaquete', nombre_paquete, 'mermas', mermas
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
        'notas', notas, 'items', items, 'producciones', producciones
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
      jsonb_build_object('moldePiezas', 40, 'ciclosLitros', 4.8, 'costosFijosMes', 0, 'usuario', '')),
    'activos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'nombre', nombre, 'categoria', categoria, 'valor', valor,
        'fecha', to_char(fecha, 'YYYY-MM-DD'), 'notas', notas
      ) order by posicion) from activos), '[]'::jsonb),
    'pasivos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'nombre', nombre, 'categoria', categoria, 'monto', monto,
        'fecha', to_char(fecha, 'YYYY-MM-DD'),
        'fechaLimite', to_char(fecha_limite, 'YYYY-MM-DD'), 'notas', notas
      ) order by posicion) from pasivos), '[]'::jsonb),
    'proveedores', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'nombre', nombre, 'ubicacion', ubicacion, 'adeudo', adeudo,
        'notas', notas, 'eventos', eventos
      ) order by posicion) from proveedores), '[]'::jsonb),
    'puntosVenta', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'nombre', nombre, 'ubicacion', ubicacion, 'adeudo', adeudo,
        'notas', notas, 'eventos', eventos
      ) order by posicion) from puntos_venta), '[]'::jsonb)
  )
$$;

-- ── RPC: guardar_libro (reemplazo completo) ──────────────────

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
                       ultimo_costo, precio_unit, precio_mayoreo, lugar, notas, historial,
                       por_paquete, unidades_por_paquete, nombre_paquete, mermas, posicion)
  select e.v->>'id', coalesce(e.v->>'nombre', ''), coalesce(e.v->>'tipo', 'Otro'),
         coalesce(e.v->>'unidad', 'kg'), fq_num(e.v->>'merma'), fq_num(e.v->>'stock'),
         fq_num(e.v->>'stockMin'), fq_num(e.v->>'costoProm'), fq_num(e.v->>'ultimoCosto'),
         fq_num(e.v->>'precioUnit'), fq_num(e.v->>'precioMayoreo'),
         coalesce(e.v->>'lugar', ''), coalesce(e.v->>'notas', ''),
         coalesce(e.v->'historial', '[]'::jsonb),
         fq_bool(e.v->>'porPaquete'), fq_num(e.v->>'unidadesPorPaquete'),
         coalesce(e.v->>'nombrePaquete', ''), coalesce(e.v->'mermas', '[]'::jsonb), e.ord
  from jsonb_array_elements(coalesce(payload->'insumos', '[]'::jsonb)) with ordinality e(v, ord)
  where coalesce(e.v->>'id', '') <> ''
  on conflict (id) do update set
    nombre = excluded.nombre, tipo = excluded.tipo, unidad = excluded.unidad,
    merma = excluded.merma, stock = excluded.stock, stock_min = excluded.stock_min,
    costo_prom = excluded.costo_prom, ultimo_costo = excluded.ultimo_costo,
    precio_unit = excluded.precio_unit, precio_mayoreo = excluded.precio_mayoreo,
    lugar = excluded.lugar, notas = excluded.notas, historial = excluded.historial,
    por_paquete = excluded.por_paquete, unidades_por_paquete = excluded.unidades_por_paquete,
    nombre_paquete = excluded.nombre_paquete, mermas = excluded.mermas, posicion = excluded.posicion;

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
                       stock, notas, items, producciones, posicion)
  select e.v->>'id', coalesce(e.v->>'sabor', ''), coalesce(e.v->>'linea', ''),
         fq_num(e.v->>'litros'), fq_num(e.v->>'piezas'), fq_num(e.v->>'precioMenudeo'),
         fq_num(e.v->>'precioMayoreo'), fq_num(e.v->>'stock'),
         coalesce(e.v->>'notas', ''), coalesce(e.v->'items', '[]'::jsonb),
         coalesce(e.v->'producciones', '[]'::jsonb), e.ord
  from jsonb_array_elements(coalesce(payload->'recetas', '[]'::jsonb)) with ordinality e(v, ord)
  where coalesce(e.v->>'id', '') <> ''
  on conflict (id) do update set
    sabor = excluded.sabor, linea = excluded.linea, litros = excluded.litros,
    piezas = excluded.piezas, precio_menudeo = excluded.precio_menudeo,
    precio_mayoreo = excluded.precio_mayoreo, stock = excluded.stock,
    notas = excluded.notas, items = excluded.items, producciones = excluded.producciones,
    posicion = excluded.posicion;

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

  -- ACTIVOS
  delete from activos t where not exists (
    select 1 from jsonb_array_elements(coalesce(payload->'activos', '[]'::jsonb)) e(v)
    where e.v->>'id' = t.id);
  insert into activos (id, nombre, categoria, valor, fecha, notas, posicion)
  select e.v->>'id', coalesce(e.v->>'nombre', ''), coalesce(e.v->>'categoria', 'Otro'),
         fq_num(e.v->>'valor'), fq_fecha(e.v->>'fecha'), coalesce(e.v->>'notas', ''), e.ord
  from jsonb_array_elements(coalesce(payload->'activos', '[]'::jsonb)) with ordinality e(v, ord)
  where coalesce(e.v->>'id', '') <> ''
  on conflict (id) do update set
    nombre = excluded.nombre, categoria = excluded.categoria, valor = excluded.valor,
    fecha = excluded.fecha, notas = excluded.notas, posicion = excluded.posicion;

  -- PASIVOS
  delete from pasivos t where not exists (
    select 1 from jsonb_array_elements(coalesce(payload->'pasivos', '[]'::jsonb)) e(v)
    where e.v->>'id' = t.id);
  insert into pasivos (id, nombre, categoria, monto, fecha, fecha_limite, notas, posicion)
  select e.v->>'id', coalesce(e.v->>'nombre', ''), coalesce(e.v->>'categoria', 'Otro'),
         fq_num(e.v->>'monto'), fq_fecha(e.v->>'fecha'),
         fq_fecha_ok(e.v->>'fechaLimite'), coalesce(e.v->>'notas', ''), e.ord
  from jsonb_array_elements(coalesce(payload->'pasivos', '[]'::jsonb)) with ordinality e(v, ord)
  where coalesce(e.v->>'id', '') <> ''
  on conflict (id) do update set
    nombre = excluded.nombre, categoria = excluded.categoria, monto = excluded.monto,
    fecha = excluded.fecha, fecha_limite = excluded.fecha_limite, notas = excluded.notas,
    posicion = excluded.posicion;

  -- PROVEEDORES
  delete from proveedores t where not exists (
    select 1 from jsonb_array_elements(coalesce(payload->'proveedores', '[]'::jsonb)) e(v)
    where e.v->>'id' = t.id);
  insert into proveedores (id, nombre, ubicacion, adeudo, notas, eventos, posicion)
  select e.v->>'id', coalesce(e.v->>'nombre', ''), coalesce(e.v->>'ubicacion', ''),
         fq_num(e.v->>'adeudo'), coalesce(e.v->>'notas', ''),
         coalesce(e.v->'eventos', '[]'::jsonb), e.ord
  from jsonb_array_elements(coalesce(payload->'proveedores', '[]'::jsonb)) with ordinality e(v, ord)
  where coalesce(e.v->>'id', '') <> ''
  on conflict (id) do update set
    nombre = excluded.nombre, ubicacion = excluded.ubicacion, adeudo = excluded.adeudo,
    notas = excluded.notas, eventos = excluded.eventos, posicion = excluded.posicion;

  -- PUNTOS DE VENTA
  delete from puntos_venta t where not exists (
    select 1 from jsonb_array_elements(coalesce(payload->'puntosVenta', '[]'::jsonb)) e(v)
    where e.v->>'id' = t.id);
  insert into puntos_venta (id, nombre, ubicacion, adeudo, notas, eventos, posicion)
  select e.v->>'id', coalesce(e.v->>'nombre', ''), coalesce(e.v->>'ubicacion', ''),
         fq_num(e.v->>'adeudo'), coalesce(e.v->>'notas', ''),
         coalesce(e.v->'eventos', '[]'::jsonb), e.ord
  from jsonb_array_elements(coalesce(payload->'puntosVenta', '[]'::jsonb)) with ordinality e(v, ord)
  where coalesce(e.v->>'id', '') <> ''
  on conflict (id) do update set
    nombre = excluded.nombre, ubicacion = excluded.ubicacion, adeudo = excluded.adeudo,
    notas = excluded.notas, eventos = excluded.eventos, posicion = excluded.posicion;

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
