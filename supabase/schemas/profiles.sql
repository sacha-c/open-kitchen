-- 1. Create table
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  updated_at timestamp with time zone,
  username text UNIQUE CHECK (char_length(username) >= 3),
  full_name text,
  avatar_url text,
  website text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- 2. Enable RLS
alter table profiles enable row level security;

-- 3. Create Policy
create policy "Enable read access for all users"
on "public"."profiles"
for select using (true);

create policy "Enable insert for users based on user_id"
on "public"."profiles"
for insert with check (
  (select auth.uid()) = id
);

create policy "Enable update for users based on user_id"
on "public"."profiles"
for update with check (
  (select auth.uid()) = id
);