-- ============================================================
--  INNOVATAR — Esquema · Tabla de Leads + RLS (Mini CRM)
--  Ejecuta este script en: Supabase → SQL Editor → New query
--  (Para una instalación NUEVA. Si ya corriste la versión
--   anterior, usa en cambio supabase/02_crm_update.sql)
-- ============================================================

-- 1. TABLA LEADS
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- contacto
  nombre      text not null,
  telefono    text not null,
  email       text,
  empresa     text,
  region      text,

  -- requerimiento
  segmento    text,
  servicios   text[],
  mensaje     text,
  descripcion text,
  urgencia    text,                  -- alta | media | baja

  -- gestión CRM
  origen      text not null default 'web',    -- home_form | cotizar | diagnostico
  estado      text not null default 'nuevo',  -- nuevo|contactado|cotizado|ganado|perdido
  notas       text,                            -- seguimiento del equipo
  utm         jsonb
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);

-- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================
alter table public.leads enable row level security;

-- LECTURA: cualquier usuario autenticado ve todos los leads.
drop policy if exists "equipo_lee_todos_los_leads" on public.leads;
create policy "equipo_lee_todos_los_leads"
  on public.leads for select to authenticated using (true);

-- ACTUALIZACIÓN: cualquier usuario autenticado puede cambiar estado/notas.
-- (Mini CRM — Fase 1. La escritura inicial del lead la sigue haciendo el
--  Worker con la service_role key.)
drop policy if exists "equipo_actualiza_leads" on public.leads;
create policy "equipo_actualiza_leads"
  on public.leads for update to authenticated using (true) with check (true);

-- INSERT: sin política pública. Solo el Worker (service_role) inserta.

-- ============================================================
-- 3. Trigger para mantener updated_at al día
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists leads_touch_updated_at on public.leads;
create trigger leads_touch_updated_at
  before update on public.leads
  for each row execute function public.touch_updated_at();
