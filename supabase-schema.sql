-- 在 Supabase SQL Editor 中执行此文件

-- 打卡记录表
create table if not exists public.checkins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  note text,
  created_at timestamptz default now() not null,
  unique(user_id, date)  -- 每人每天只能打一次卡
);

-- 题目计划表
create table if not exists public.plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
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

-- 开启 RLS（行级安全）
alter table public.checkins enable row level security;
alter table public.plans enable row level security;

-- RLS 策略：只能操作自己的数据
create policy "Users can manage their own checkins"
  on public.checkins for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own plans"
  on public.plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 索引
create index checkins_user_date on public.checkins(user_id, date);
create index plans_user_status on public.plans(user_id, status);
