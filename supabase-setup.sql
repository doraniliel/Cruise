-- ============================================================
--  הקרוז הגדול — הקמת מסד הנתונים ב-Supabase
--  איך מריצים: Supabase Dashboard -> SQL Editor -> New query ->
--  להדביק את כל הקובץ הזה -> Run.
-- ============================================================

-- ===== קיר החבורה =====
create table if not exists public.wall (
  id         bigint generated always as identity primary key,
  name       text,
  body       text not null,
  created_at timestamptz not null default now()
);

alter table public.wall enable row level security;

drop policy if exists wall_read on public.wall;
create policy wall_read on public.wall
  for select using (true);

drop policy if exists wall_insert on public.wall;
create policy wall_insert on public.wall
  for insert with check (
    char_length(body) between 1 and 200
    and char_length(coalesce(name, '')) <= 30
  );

-- ===== מד התלהבות =====
create table if not exists public.hype (
  id    int primary key,
  count bigint not null default 0
);

insert into public.hype (id, count) values (1, 0)
  on conflict (id) do nothing;

alter table public.hype enable row level security;

drop policy if exists hype_read on public.hype;
create policy hype_read on public.hype
  for select using (true);

-- הגדלה אטומית של המונה (עד 50 בכל קריאה, כדי למנוע ניצול לרעה)
create or replace function public.bump_hype(n int default 1)
  returns bigint
  language sql
  security definer
  set search_path = public
as $$
  update public.hype
     set count = count + greatest(1, least(coalesce(n, 1), 50))
   where id = 1
  returning count;
$$;

grant execute on function public.bump_hype(int) to anon, authenticated;

-- רענון מטמון הסכימה (ליתר ביטחון, כדי שה-API יכיר את הטבלאות מיד)
notify pgrst, 'reload schema';
