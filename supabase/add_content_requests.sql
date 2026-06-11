create table if not exists content_requests (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('restaurant', 'menu')),
  action_type text not null check (action_type in ('add', 'update', 'delete')),
  restaurant_id text references restaurants(id) on delete set null,
  menu_id uuid references menus(id) on delete set null,
  title text not null,
  details text not null default '',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  visitor_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists content_requests_entity_idx on content_requests(entity_type, action_type);
create index if not exists content_requests_visitor_idx on content_requests(visitor_id);

alter table content_requests enable row level security;

drop policy if exists "public insert content requests" on content_requests;

create policy "public insert content requests"
  on content_requests for insert
  with check (
    visitor_id is not null
    and length(visitor_id) between 16 and 80
    and entity_type in ('restaurant', 'menu')
    and action_type in ('add', 'update', 'delete')
  );

grant insert on content_requests to anon, authenticated;
