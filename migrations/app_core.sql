create table if not exists sync_idempotency (
  mutation_id text not null,
  farm_id text not null,
  created_at timestamptz not null default now(),
  primary key (farm_id, mutation_id)
);
create table if not exists animals (
  id text not null,
  farm_id text not null references farms(id) on delete cascade,
  rfid text not null,
  code text not null,
  sex text not null,
  breed text not null,
  birth_date date not null,
  weight_kg numeric,
  bcs numeric,
  stage text not null,
  pen text not null,
  status text not null,
  last_scan_at timestamptz,
  adg_kg numeric,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (farm_id, id),
  unique(farm_id, code),
  unique(farm_id, rfid)
);
create index if not exists animals_farm_id_idx on animals(farm_id);
