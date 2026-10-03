create table if not exists farms (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists farm_memberships (
  id text primary key,
  user_id text not null,
  farm_id text not null references farms(id) on delete cascade,
  role text not null check (role in ('OWNER','MANAGER','OPERATOR')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, farm_id)
);
create index if not exists farm_memberships_user_id_idx on farm_memberships(user_id);
create index if not exists farm_memberships_farm_id_idx on farm_memberships(farm_id);
