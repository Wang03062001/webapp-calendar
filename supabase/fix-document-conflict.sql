-- Run once in the existing project's SQL Editor. Safe to run again.
-- Changes only the revision-conflict SQLSTATE in the existing save function.
-- Keeps its validation, revision condition, owner, grants, RLS and all data.
begin;

do $repair$
declare
  target regprocedure := to_regprocedure('public.save_calendar_document(jsonb,bigint)');
  definition text;
  patched text;
  matches integer;
  pattern text := '(raise[[:space:]]+exception[[:space:]]+''Document changed on another device''[[:space:]]+using[[:space:]]+errcode[[:space:]]*=[[:space:]]*)''40001''';
begin
  if target is null then
    raise exception 'save_calendar_document(jsonb,bigint) is missing; no changes made' using errcode = '22023';
  end if;
  definition := pg_get_functiondef(target);
  select count(*) into matches from regexp_matches(definition, pattern, 'gi');
  if matches = 0 and definition ~* replace(pattern, '40001', 'PT409') then
    raise notice 'Revision conflicts already use PT409; no changes needed';
    return;
  end if;
  if matches <> 1 then
    raise exception 'Unexpected save_calendar_document body; inspect it before changing anything' using errcode = '22023';
  end if;
  patched := regexp_replace(definition, pattern, E'\\1''PT409''', 'i');
  execute patched;
end;
$repair$;

notify pgrst, 'reload schema';
commit;

-- Metadata-only verification; no financial rows are read.
select p.oid::regprocedure as saved_function,
       p.prosrc ~* 'Document changed on another device''[[:space:]]+using[[:space:]]+errcode[[:space:]]*=[[:space:]]*''PT409''' as conflict_returns_http_409
from pg_proc p
where p.oid = to_regprocedure('public.save_calendar_document(jsonb,bigint)');
