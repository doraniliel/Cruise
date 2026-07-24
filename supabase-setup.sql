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

-- ===== צ'ק-אין יומי =====
create table if not exists public.checkins (
  name text not null,
  day  date not null default (now() at time zone 'utc')::date,
  primary key (name, day)
);
alter table public.checkins enable row level security;
drop policy if exists checkins_read on public.checkins;
create policy checkins_read on public.checkins for select using (true);

create or replace function public.do_checkin(p_name text, p_pin text)
  returns void language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.members where name = p_name and pin = p_pin) then
    raise exception 'invalid credentials' using errcode = '28000';
  end if;
  insert into public.checkins (name, day)
  values (p_name, (now() at time zone 'utc')::date)
  on conflict do nothing;
end;
$$;
grant execute on function public.do_checkin(text, text) to anon, authenticated;

-- ===== הצבעות / הימור יומי =====
create table if not exists public.votes (
  poll       text not null,
  name       text not null,
  choice     text not null,
  created_at timestamptz not null default now(),
  primary key (poll, name)
);
alter table public.votes enable row level security;
drop policy if exists votes_read on public.votes;
create policy votes_read on public.votes for select using (true);

create or replace function public.cast_vote(p_name text, p_pin text, p_poll text, p_choice text)
  returns void language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.members where name = p_name and pin = p_pin) then
    raise exception 'invalid credentials' using errcode = '28000';
  end if;
  insert into public.votes (poll, name, choice) values (p_poll, p_name, left(p_choice, 60))
  on conflict (poll, name) do update set choice = excluded.choice, created_at = now();
end;
$$;
grant execute on function public.cast_vote(text, text, text, text) to anon, authenticated;

-- ===== ריאקשנים על הודעות בקיר =====
create table if not exists public.reactions (
  msg_id bigint not null references public.wall(id) on delete cascade,
  name   text not null,
  emoji  text not null,
  primary key (msg_id, name, emoji)
);
alter table public.reactions enable row level security;
drop policy if exists reactions_read on public.reactions;
create policy reactions_read on public.reactions for select using (true);

create or replace function public.toggle_reaction(p_name text, p_pin text, p_msg bigint, p_emoji text)
  returns boolean language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.members where name = p_name and pin = p_pin) then
    raise exception 'invalid credentials' using errcode = '28000';
  end if;
  if exists (select 1 from public.reactions where msg_id = p_msg and name = p_name and emoji = p_emoji) then
    delete from public.reactions where msg_id = p_msg and name = p_name and emoji = p_emoji;
    return false;
  else
    insert into public.reactions (msg_id, name, emoji) values (p_msg, p_name, p_emoji);
    return true;
  end if;
end;
$$;
grant execute on function public.toggle_reaction(text, text, bigint, text) to anon, authenticated;

-- ===== לוח מובילים =====
create or replace function public.leaderboard()
  returns table(name text, points bigint) language sql security definer set search_path = public
as $$
  select m.name,
    (coalesce(c.d, 0) * 2 + coalesce(w.p, 0) * 3 + coalesce(v.q, 0) + coalesce(r.k, 0))::bigint as points
  from public.members m
  left join (select name, count(*) d from public.checkins group by name) c on c.name = m.name
  left join (select name, count(*) p from public.wall     group by name) w on w.name = m.name
  left join (select name, count(*) q from public.votes    group by name) v on v.name = m.name
  left join (select name, count(*) k from public.reactions group by name) r on r.name = m.name
  order by points desc, m.name;
$$;
grant execute on function public.leaderboard() to anon, authenticated;

notify pgrst, 'reload schema';

-- ============================================================
--  זריעת הקודים (מריצים בנפרד עם הערכים האמיתיים):
--
--  insert into public.members (name, pin) values
--    ('שם', 'קוד'), ...
--  on conflict (name) do update set pin = excluded.pin;
-- ============================================================
