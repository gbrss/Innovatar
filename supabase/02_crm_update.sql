-- ============================================================
--  INNOVATAR — Migración a Mini CRM
--  Ejecuta esto SOLO si ya corriste el schema.sql anterior
--  (el de solo-lectura). Es idempotente: puedes correrlo sin
--  miedo aunque algo ya exista.
-- ============================================================

-- 1. Columnas nuevas para gestión
alter table public.leads add column if not exists notas text;
alter table public.leads add column if not exists updated_at timestamptz not null default now();

-- 2. Política de ACTUALIZACIÓN (permite cambiar estado y notas desde el dashboard)
drop policy if exists "equipo_actualiza_leads" on public.leads;
create policy "equipo_actualiza_leads"
  on public.leads for update to authenticated using (true) with check (true);

-- 3. Trigger para updated_at
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
