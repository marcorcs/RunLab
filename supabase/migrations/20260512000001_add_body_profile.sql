alter table public.profiles
  add column if not exists gender text,
  add column if not exists birth_year integer,
  add column if not exists height_cm integer,
  add column if not exists weight_kg numeric(5,1);
