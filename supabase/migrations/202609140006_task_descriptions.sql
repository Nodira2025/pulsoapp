begin;
alter table public.tasks add column if not exists description text not null default '';
-- Preserve every word from the old form before making the display title concise.
update public.tasks
set description = title || case when description <> '' then E'\n\n' || description else '' end,
    title = case when length(trim(regexp_replace(title, '\s+', ' ', 'g'))) > 80
      then rtrim(left(trim(regexp_replace(title, '\s+', ' ', 'g')), 79)) || '…'
      else trim(regexp_replace(title, '\s+', ' ', 'g')) end
where length(trim(regexp_replace(title, '\s+', ' ', 'g'))) > 80 or title ~ E'[\r\n]';
commit;
