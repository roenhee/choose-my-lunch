create extension if not exists pgcrypto;

drop view if exists restaurant_cards;
drop table if exists content_requests;
drop table if exists likes;
drop table if exists menus;
drop table if exists restaurants;

create table restaurants (
  id text primary key,
  source_row integer,
  store_name text not null,
  naver_place_name text not null,
  category text not null,
  address text,
  naver_road_address text,
  first_image text,
  naver_url text,
  created_at timestamptz not null default now()
);

create table menus (
  id uuid primary key default gen_random_uuid(),
  restaurant_id text not null references restaurants(id) on delete cascade,
  menu_index integer,
  name text not null,
  price_text text,
  price_min integer,
  price_max integer,
  description text,
  recommended boolean not null default false,
  image_url text,
  created_at timestamptz not null default now()
);

create table likes (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('restaurant', 'menu')),
  target_id text not null,
  visitor_id text not null,
  created_at timestamptz not null default now(),
  unique (target_type, target_id, visitor_id)
);

create or replace function toggle_like(
  p_target_type text,
  p_target_id text,
  p_visitor_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if p_target_type not in ('restaurant', 'menu') then
    raise exception 'invalid target type';
  end if;

  if p_visitor_id is null or length(p_visitor_id) < 16 or length(p_visitor_id) > 80 then
    raise exception 'invalid visitor id';
  end if;

  delete from likes
  where target_type = p_target_type
    and target_id = p_target_id
    and visitor_id = p_visitor_id;

  get diagnostics deleted_count = row_count;

  if deleted_count > 0 then
    return jsonb_build_object('liked', false);
  end if;

  insert into likes(target_type, target_id, visitor_id)
  values (p_target_type, p_target_id, p_visitor_id);

  return jsonb_build_object('liked', true);
end;
$$;

create table content_requests (
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

create index restaurants_category_idx on restaurants(category);
create index menus_restaurant_id_idx on menus(restaurant_id);
create index menus_price_min_idx on menus(price_min);
create index likes_target_idx on likes(target_type, target_id);
create index content_requests_entity_idx on content_requests(entity_type, action_type);
create index content_requests_visitor_idx on content_requests(visitor_id);

create view restaurant_cards as
select
  r.*,
  coalesce(rl.like_count, 0)::integer as like_count,
  coalesce(mc.menu_count, 0)::integer as menu_count
from restaurants r
left join (
  select target_id, count(*) as like_count
  from likes
  where target_type = 'restaurant'
  group by target_id
) rl on rl.target_id = r.id
left join (
  select restaurant_id, count(*) as menu_count
  from menus
  group by restaurant_id
) mc on mc.restaurant_id = r.id;

alter table restaurants enable row level security;
alter table menus enable row level security;
alter table likes enable row level security;
alter table content_requests enable row level security;

create policy "public read restaurants"
  on restaurants for select
  using (true);

create policy "public read menus"
  on menus for select
  using (true);

create policy "public read likes"
  on likes for select
  using (true);

create policy "public insert likes"
  on likes for insert
  with check (
    visitor_id is not null
    and length(visitor_id) between 16 and 80
    and target_type in ('restaurant', 'menu')
  );

create policy "public insert content requests"
  on content_requests for insert
  with check (
    visitor_id is not null
    and length(visitor_id) between 16 and 80
    and entity_type in ('restaurant', 'menu')
    and action_type in ('add', 'update', 'delete')
  );

grant select on restaurant_cards to anon, authenticated;
grant insert on content_requests to anon, authenticated;
grant execute on function toggle_like(text, text, text) to anon, authenticated;
