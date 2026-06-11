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

grant execute on function toggle_like(text, text, text) to anon, authenticated;
