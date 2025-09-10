-- Nettoyage des objets existants
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists validate_user_role_before_insert on auth.users;
drop trigger if exists update_user_profiles_updated_at on user_profiles;
drop function if exists public.handle_new_user();
drop function if exists public.validate_user_role();
drop function if exists update_updated_at_column();
drop policy if exists "Users can view all profiles" on user_profiles;
drop policy if exists "Allow initial profile creation" on user_profiles;
drop policy if exists "Only admins can update profiles" on user_profiles;
drop table if exists user_profiles;
drop type if exists user_role;

-- Create roles enum
create type user_role as enum ('admin', 'manager', 'technicien');

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create user_profiles table to store additional user information
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade default uuid_generate_v4(),
  nom text,
  prenom text,
  email text,
  role user_role not null default 'technicien',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  is_active boolean default true
);

-- Add trigger for updating updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

create trigger update_user_profiles_updated_at
    before update on user_profiles
    for each row
    execute procedure update_updated_at_column();

-- Create function to sync email from auth.users to user_profiles
create or replace function sync_user_email()
returns trigger as $$
begin
    update user_profiles
    set email = new.email
    where id = new.id;
    return new;
end;
$$ language 'plpgsql';

-- Create trigger to sync email on auth.users update
create trigger sync_user_email_trigger
    after update of email on auth.users
    for each row
    execute procedure sync_user_email();

-- Enable Row Level Security
alter table user_profiles enable row level security;

-- Grant necessary permissions to authenticated users
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_profiles TO anon;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create policies
create policy "Users can view all profiles"
  on user_profiles for select
  using (true);

create policy "Users can view own profile"
  on user_profiles for select
  using (auth.uid() = id);

create policy "Allow initial profile creation"
  on user_profiles for insert
  with check (auth.uid() = id OR EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() = id
    AND raw_user_meta_data->>'role' = 'admin'
  ));

create policy "Users can update own profile"
  on user_profiles for update
  using (auth.uid() = id)
  with check (
    CASE 
      WHEN auth.uid() = id THEN true
      ELSE EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'admin'
      )
    END
  );

-- Function to validate user role
create or replace function public.validate_user_role()
returns trigger as $$
begin
  if new.raw_user_meta_data->>'role' not in ('admin', 'manager', 'technicien') then
    raise exception 'Le rôle doit être admin, manager ou technicien';
  end if;
  return new;
end;
$$ language plpgsql;

-- Trigger to validate user role before creation
create trigger validate_user_role_before_insert
  before insert on auth.users
  for each row execute procedure public.validate_user_role();

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  default_role user_role;
begin
  -- Vérifier si le rôle est spécifié dans les métadonnées
  if new.raw_user_meta_data->>'role' is not null then
    default_role := (new.raw_user_meta_data->>'role')::user_role;
  else
    default_role := 'technicien';
  end if;

  -- Vérifier si le mot de passe est défini
  if new.encrypted_password is null then
    raise exception 'Le mot de passe est obligatoire';
  end if;

  -- Créer le profil utilisateur
  insert into public.user_profiles (id, role, nom, prenom, email)
  values (
    new.id,
    default_role,
    coalesce(new.raw_user_meta_data->>'nom', ''),
    coalesce(new.raw_user_meta_data->>'prenom', ''),
    new.email
  );
  return new;
end;
$$;

-- Trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to safely insert a default user
CREATE OR REPLACE FUNCTION insert_default_user(
  p_email TEXT,
  p_password TEXT,
  p_nom TEXT,
  p_prenom TEXT,
  p_role TEXT
) RETURNS void AS $$
BEGIN
  -- Check if user already exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at,
      aud,
      role
    ) VALUES (
      uuid_generate_v4(),
      '00000000-0000-0000-0000-000000000000',
      p_email,
      crypt(p_password, gen_salt('bf')),
      now(),
      jsonb_build_object(
        'nom', p_nom,
        'prenom', p_prenom,
        'role', p_role
      ),
      now(),
      now(),
      'authenticated',
      'authenticated'
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Insert default users safely
DO $$ 
BEGIN
  -- Create admin user
  PERFORM insert_default_user(
    'admin@telecom.com',
    'admin123',
    'Admin',
    'System',
    'admin'
  );
  
  -- Create manager user
  PERFORM insert_default_user(
    'manager@telecom.com',
    'manager123',
    'Manager',
    'Stock',
    'manager'
  );
  
  -- Create technician user
  PERFORM insert_default_user(
    'tech@telecom.com',
    'tech123',
    'Technicien',
    'Support',
    'technicien'
  );
END $$;
