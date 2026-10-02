-- Chạy 1 lần trong Supabase > SQL Editor > New query

alter table public.shifts
  add column if not exists extras jsonb not null default '[]'::jsonb,
  add column if not exists photo_start text,
  add column if not exists photo_end text;

create index if not exists shifts_user_id_idx on public.shifts(user_id);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  positions jsonb not null default '["Phục vụ","Pha chế","Thu ngân","Bếp","Khác"]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "Users can view their own settings" on public.user_settings;
drop policy if exists "Users can insert their own settings" on public.user_settings;
drop policy if exists "Users can update their own settings" on public.user_settings;
drop policy if exists "Users can delete their own settings" on public.user_settings;

create policy "Users can view their own settings"
on public.user_settings for select to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own settings"
on public.user_settings for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own settings"
on public.user_settings for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own settings"
on public.user_settings for delete to authenticated
using (auth.uid() = user_id);
