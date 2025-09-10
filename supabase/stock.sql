-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create articles table
create table if not exists articles (
  id uuid primary key default uuid_generate_v4(),
  codeBarres text unique,
  nom text not null,
  description text,
  marque text,
  modele text,
  quantiteStock integer default 0,
  seuilMinimum integer default 5,
  prix decimal(10,2),
  emplacement text,
  fournisseurId uuid,
  createdAt timestamp with time zone default now(),
  updatedAt timestamp with time zone default now()
);

-- Create mouvements table
create table if not exists mouvements (
  id uuid primary key default uuid_generate_v4(),
  type text not null check (type in ('ENTREE', 'SORTIE')),
  quantite integer not null,
  articleId uuid references articles(id) on delete cascade,
  userId uuid,
  dateHeure timestamp with time zone default now(),
  raison text
);

-- Create fournisseurs table
create table if not exists fournisseurs (
  id uuid primary key default uuid_generate_v4(),
  nom text not null,
  contact text,
  email text,
  telephone text,
  adresse text,
  createdAt timestamp with time zone default now(),
  updatedAt timestamp with time zone default now()
);

-- Add indexes
create index if not exists idx_articles_codebarre on articles(codeBarres);
create index if not exists idx_mouvements_article on mouvements(articleId);
create index if not exists idx_mouvements_date on mouvements(dateHeure);

-- Enable Row Level Security
alter table articles enable row level security;
alter table mouvements enable row level security;
alter table fournisseurs enable row level security;

-- Create policies
create policy "Enable read access for all users" on articles for select using (true);
create policy "Enable read access for all users" on mouvements for select using (true);
create policy "Enable read access for all users" on fournisseurs for select using (true);

create policy "Enable insert for authenticated users" on articles for insert with check (auth.role() = 'authenticated');
create policy "Enable insert for authenticated users" on mouvements for insert with check (auth.role() = 'authenticated');
create policy "Enable insert for authenticated users" on fournisseurs for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users" on articles for update using (auth.role() = 'authenticated');
create policy "Enable update for authenticated users" on mouvements for update using (auth.role() = 'authenticated');
create policy "Enable update for authenticated users" on fournisseurs for update using (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users" on articles for delete using (auth.role() = 'authenticated');
create policy "Enable delete for authenticated users" on mouvements for delete using (auth.role() = 'authenticated');
create policy "Enable delete for authenticated users" on fournisseurs for delete using (auth.role() = 'authenticated');
