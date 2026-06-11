create extension if not exists pgcrypto;

drop view if exists restaurant_cards;
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

create index restaurants_category_idx on restaurants(category);
create index menus_restaurant_id_idx on menus(restaurant_id);
create index menus_price_min_idx on menus(price_min);
create index likes_target_idx on likes(target_type, target_id);

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

grant select on restaurant_cards to anon, authenticated;
