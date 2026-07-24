-- ============================================================
--  הקרוז הגדול — הקמת מסד הנתונים ב-Supabase
--  איך מריצים: Supabase Dashboard -> SQL Editor -> New query ->
--  להדביק את הקובץ -> Run.
--
--  הערה: הקודים האישיים (PIN) לא נמצאים בקובץ הזה בכוונה, כדי
--  שלא ידלפו לריפו. את שורות ה-INSERT עם הקודים מריצים בנפרד
--  (הן נמסרות בפרטי), ראו בתחתית.
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

-- אין policy ל-INSERT: כותבים לקיר רק דרך הפונקציה post_to_wall (שמאמתת קוד).
drop policy if exists wall_insert on public.wall;

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

create or replace function public.bump_hype(n int default 1)
  returns bigint language sql security definer set search_path = public
as $$
  update public.hype
     set count = count + greatest(1, least(coalesce(n, 1), 50))
   where id = 1
  returning count;
$$;
grant execute on function public.bump_hype(int) to anon, authenticated;

-- ===== חברים + קוד אישי (PIN) =====
create table if not exists public.members (
  name text primary key,
  pin  text not null
);

alter table public.members enable row level security;
-- אין policy כלל => המפתח הציבורי לא יכול לקרוא/לכתוב קודים ישירות.
-- הגישה היחידה היא דרך הפונקציות שלמטה (SECURITY DEFINER).

-- אימות: true אם השם והקוד תואמים
create or replace function public.verify_member(p_name text, p_pin text)
  returns boolean language sql security definer set search_path = public
as $$
  select exists (
    select 1 from public.members where name = p_name and pin = p_pin
  );
$$;
grant execute on function public.verify_member(text, text) to anon, authenticated;

-- פרסום לקיר — רק עם שם + קוד תקינים
create or replace function public.post_to_wall(p_name text, p_pin text, p_body text)
  returns public.wall language plpgsql security definer set search_path = public
as $$
declare r public.wall;
begin
  if not exists (select 1 from public.members where name = p_name and pin = p_pin) then
    raise exception 'invalid credentials' using errcode = '28000';
  end if;
  if char_length(coalesce(p_body, '')) not between 1 and 200 then
    raise exception 'invalid body length';
  end if;
  insert into public.wall (name, body) values (p_name, left(p_body, 200)) returning * into r;
  return r;
end;
$$;
grant execute on function public.post_to_wall(text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';

-- ============================================================
--  זריעת הקודים (מריצים בנפרד עם הערכים האמיתיים):
--
--  insert into public.members (name, pin) values
--    ('שם', 'קוד'), ...
--  on conflict (name) do update set pin = excluded.pin;
-- ============================================================
