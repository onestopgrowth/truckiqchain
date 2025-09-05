-- Create carrier_documents table for uploaded carrier docs

create table if not exists public.carrier_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  carrier_profile_id uuid references public.carrier_profiles(id) on delete cascade,
  doc_type text not null check (doc_type in ('w9','coi','authority','document')),
  file_name text,
  file_path text,
  file_hash text,
  file_size integer,
  mime_type text,
  review_status text default 'pending' check (review_status in ('pending','approved','rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.carrier_documents enable row level security;

-- Allow carriers to insert their own docs and view their docs; Admin role (if you create one) can view/approve
create policy "carrier_documents_select_own"
  on public.carrier_documents for select
  using (
    user_id = auth.uid()
  );

create policy "carrier_documents_insert_own"
  on public.carrier_documents for insert
  with check (
    user_id = auth.uid()
  );

create policy "carrier_documents_update_admin"
  on public.carrier_documents for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'admin')
  );

create policy "carrier_documents_delete_own"
  on public.carrier_documents for delete
  using (
    user_id = auth.uid()
  );

-- Indexes
create index if not exists carrier_documents_user_idx on public.carrier_documents(user_id);
create index if not exists carrier_documents_profile_idx on public.carrier_documents(carrier_profile_id);
create index if not exists carrier_documents_doc_type_idx on public.carrier_documents(doc_type);
