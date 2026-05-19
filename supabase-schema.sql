-- 在 Supabase SQL Editor 中执行此文件
-- 如果之前已经创建过表，先 DROP（注意会清空数据）：
-- drop table if exists public.checkin_replies cascade;
-- drop table if exists public.checkins cascade;
-- drop table if exists public.plans cascade;
-- drop table if exists public.topics cascade;
-- drop table if exists public.profiles cascade;

-- ========== 用户档案（区分 owner 和 admin） ==========
create table if not exists public.profiles (
  user_id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  role text check (role in ('owner', 'admin')) not null,
  created_at timestamptz default now() not null
);

-- 辅助函数：当前用户的角色
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where user_id = auth.uid();
$$;

-- 辅助函数：owner 的 user_id（用于 admin 查询 owner 的数据）
create or replace function public.owner_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select user_id from public.profiles where role = 'owner' limit 1;
$$;

-- ========== 打卡记录（只有 owner 拥有） ==========
create table if not exists public.checkins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  note text,
  created_at timestamptz default now() not null,
  unique(user_id, date)
);

-- ========== Topic 分类（admin 管理，全员可读） ==========
create table if not exists public.topics (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  sort_order integer default 0 not null,
  created_at timestamptz default now() not null
);

-- ========== 题目计划（只有 owner 拥有；topic 由 admin 维护） ==========
create table if not exists public.plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  topic_id uuid references public.topics(id) on delete set null,
  lc_number integer not null,
  title text not null,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')) not null,
  tags text[] default '{}',
  target_date date,
  status text check (status in ('todo', 'in_progress', 'completed')) default 'todo' not null,
  note text,
  completed_at timestamptz,
  created_at timestamptz default now() not null
);

-- 如果是已有库执行（plans 表已存在但没 topic_id），手动补：
-- alter table public.plans add column if not exists topic_id uuid references public.topics(id) on delete set null;

-- ========== 打卡回复（admin 在 owner 的打卡下留言） ==========
create table if not exists public.checkin_replies (
  id uuid default gen_random_uuid() primary key,
  checkin_id uuid references public.checkins(id) on delete cascade not null,
  author_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now() not null
);

-- ========== RLS 启用 ==========
alter table public.profiles enable row level security;
alter table public.checkins enable row level security;
alter table public.plans enable row level security;
alter table public.checkin_replies enable row level security;
alter table public.topics enable row level security;

-- ========== profiles 策略 ==========
-- 登录用户可以看到所有 profiles（用于显示对方昵称）
create policy "Authenticated users can read profiles"
  on public.profiles for select
  to authenticated using (true);

-- 只允许用户自己更新自己的 profile（昵称等）
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated using (auth.uid() = user_id);

-- ========== checkins 策略 ==========
-- owner 完全控制自己的打卡
create policy "Owner can manage own checkins"
  on public.checkins for all
  to authenticated
  using (auth.uid() = user_id and public.current_user_role() = 'owner')
  with check (auth.uid() = user_id and public.current_user_role() = 'owner');

-- admin 可以读 owner 的打卡
create policy "Admin can read owner's checkins"
  on public.checkins for select
  to authenticated
  using (public.current_user_role() = 'admin' and user_id = public.owner_user_id());

-- ========== plans 策略 ==========
-- owner 完全控制自己的计划
create policy "Owner can manage own plans"
  on public.plans for all
  to authenticated
  using (auth.uid() = user_id and public.current_user_role() = 'owner')
  with check (auth.uid() = user_id and public.current_user_role() = 'owner');

-- admin 也可以完整管理 owner 的计划（增删改 + 调状态），plan.user_id 仍然是 owner 的 id
-- 注：之前只允许 admin 读，现在改为允许 admin 替 owner 排题
drop policy if exists "Admin can read owner's plans" on public.plans;
create policy "Admin can manage owner's plans"
  on public.plans for all
  to authenticated
  using (public.current_user_role() = 'admin' and user_id = public.owner_user_id())
  with check (public.current_user_role() = 'admin' and user_id = public.owner_user_id());

-- ========== checkin_replies 策略 ==========
-- admin 可以增删改自己的回复
create policy "Admin can manage own replies"
  on public.checkin_replies for all
  to authenticated
  using (public.current_user_role() = 'admin' and auth.uid() = author_id)
  with check (public.current_user_role() = 'admin' and auth.uid() = author_id);

-- owner 可以读所有回复（看 admin 给她的留言）
create policy "Owner can read replies on own checkins"
  on public.checkin_replies for select
  to authenticated
  using (
    public.current_user_role() = 'owner'
    and exists (
      select 1 from public.checkins
      where checkins.id = checkin_replies.checkin_id
        and checkins.user_id = auth.uid()
    )
  );

-- admin 也可以读自己的回复
create policy "Admin can read own replies"
  on public.checkin_replies for select
  to authenticated
  using (public.current_user_role() = 'admin' and auth.uid() = author_id);

-- ========== topics 策略 ==========
-- 所有登录用户都能读（owner 也要看分类，但不能改）
create policy "Authenticated can read topics"
  on public.topics for select
  to authenticated using (true);

-- 只有 admin 能增删改 topic
create policy "Admin can manage topics"
  on public.topics for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ========== 索引 ==========
create index if not exists checkins_user_date on public.checkins(user_id, date desc);
create index if not exists plans_user_status on public.plans(user_id, status);
create index if not exists plans_topic on public.plans(topic_id);
create index if not exists replies_checkin on public.checkin_replies(checkin_id, created_at);
create index if not exists topics_sort on public.topics(sort_order, name);

-- ========== 注册后自动建 profile 的触发器 ==========
-- 默认所有新用户为 owner。注册完两个用户后，手动把你自己改成 admin（见下方说明）。
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, role)
  values (new.id, split_part(new.email, '@', 1), 'owner');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== 部署后手动配置角色 ==========
-- 1. 让你的女朋友先用她的邮箱注册（她会自动成为 owner）
-- 2. 你自己再用 jackz021207@gmail.com 注册
-- 3. 注册完两个账号后，在 SQL Editor 跑下面这条把自己改成 admin：
--
-- update public.profiles set role = 'admin'
-- where user_id = (select id from auth.users where email = 'jackz021207@gmail.com');
