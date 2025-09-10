-- Create fournisseurs table first (because articles references it)
create table if not exists fournisseurs (
  id uuid primary key,
  nom text not null,
  contact text,
  email text,
  telephone text,
  adresse text,
  createdAt timestamp with time zone default timezone('utc'::text, now()),
  updatedAt timestamp with time zone default timezone('utc'::text, now())
);

-- Create articles table
create table if not exists articles (
  id uuid primary key,
  codeBarres text unique,
  nom text not null,
  description text,
  marque text,
  modele text,
  quantiteStock integer default 0,
  seuilMinimum integer default 5,
  prix decimal(10,2),
  emplacement text,
  fournisseurId uuid references fournisseurs(id),
  createdAt timestamp with time zone default timezone('utc'::text, now()),
  updatedAt timestamp with time zone default timezone('utc'::text, now())
);

-- Create mouvements table
create table if not exists mouvements (
  id uuid primary key,
  type text not null check (type in ('ENTREE', 'SORTIE')),
  quantite integer not null,
  articleId uuid references articles(id) on delete cascade,
  userId uuid,
  dateHeure timestamp with time zone default timezone('utc'::text, now()),
  raison text
);

-- Create inventory_entries table
create table if not exists inventory_entries (
  id uuid primary key,
  articleId uuid references articles(id) on delete cascade,
  quantiteComptee integer not null,
  dateComptage timestamp with time zone default timezone('utc'::text, now()),
  userId uuid,
  notes text
);

-- Create inventory_reports table
create table if not exists inventory_reports (
  id uuid primary key,
  dateDebut timestamp with time zone not null,
  dateFin timestamp with time zone not null,
  statut text not null check (statut in ('EN_COURS', 'TERMINE', 'ANNULE')),
  userId uuid,
  notes text,
  createdAt timestamp with time zone default timezone('utc'::text, now()),
  updatedAt timestamp with time zone default timezone('utc'::text, now())
);

-- Add indexes
create index if not exists idx_articles_codebarre on articles(codeBarres);
create index if not exists idx_mouvements_article on mouvements(articleId);
create index if not exists idx_mouvements_date on mouvements(dateHeure);
create index if not exists idx_inventory_entries_article on inventory_entries(articleId);
create index if not exists idx_inventory_entries_date on inventory_entries(dateComptage);
