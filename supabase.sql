-- شغّل هذا الملف في Supabase SQL Editor مرة واحدة.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  budget numeric(12,3) not null default 0,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,3) not null check (amount > 0),
  category text not null,
  description text not null,
  expense_date date not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.expenses enable row level security;

create policy "Users can manage their profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users can manage their expenses" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
