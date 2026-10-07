create table if not exists trades(
  id text primary key,
  account text not null, account_name text, broker text,
  pair text, dir text, lot numeric, entry numeric, exit numeric,
  sl numeric, tp numeric, pl numeric,
  open_time timestamptz, close_time timestamptz,
  magic bigint, reason text
);
create index if not exists trades_acc_close on trades(account, close_time);
create table if not exists equity(
  account text primary key, account_name text, broker text,
  equity numeric, floating numeric, positions int,
  ts timestamptz default now()
);
alter table trades enable row level security;
alter table equity enable row level security;
-- tanpa policy = hanya service key (dipakai API) yang bisa akses
