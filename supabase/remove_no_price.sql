delete from menus
where
  nullif(trim(coalesce(price_text, '')), '') is null
  or (price_min is null and price_max is null);
