begin;
alter table public.companies add column if not exists universe_visible boolean not null default false;
alter table public.projects add column if not exists universe_visible boolean not null default false;

-- Explicit public projection. Never return notes, descriptions, contacts or money.
create or replace function public.pulso_live_universe()
returns table(slug text,name text,category text,summary text,work text[],public_url text,projects jsonb,logo_url text,color text)
language sql stable security definer set search_path=public
as $$
 select c.id::text,c.name,c.industry,
   case when count(p.id)>0 then 'Proyectos publicados de '||c.name else 'Un mundo conectado con Pulso.' end,
   coalesce(array_agg(p.name order by p.created_at desc) filter(where p.id is not null),'{}'::text[]),
   coalesce((array_agg(p.public_url order by p.created_at desc) filter(where p.id is not null))[1],''),
   coalesce(jsonb_agg(jsonb_build_object('name',p.name,'url',p.public_url) order by p.created_at desc) filter(where p.id is not null),'[]'::jsonb),
   case when c.logo_path is not null then '/api/universe/logo/'||c.id::text else '' end,'#a58ad7'
 from public.companies c left join public.projects p on p.company_id=c.id and p.universe_visible
   and p.public_url ~ '^https://[^/@[:space:]]+([/?#]|$)'
   and p.public_url !~* '^https://(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)'
 where c.universe_visible and lower(trim(c.name))<>'pulso'
 group by c.id order by c.name;
$$;
revoke all on function public.pulso_live_universe() from public;
grant execute on function public.pulso_live_universe() to anon,authenticated;

create or replace function public.pulso_public_company_logo(company uuid)
returns text language sql stable security definer set search_path=public
as $$ select logo_path from public.companies where id=company and universe_visible and lower(trim(name))<>'pulso' $$;
revoke all on function public.pulso_public_company_logo(uuid) from public;
grant execute on function public.pulso_public_company_logo(uuid) to anon,authenticated;

create or replace function public.is_public_company_logo(object_name text)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.companies where universe_visible and lower(trim(name))<>'pulso' and logo_path=object_name) $$;
revoke all on function public.is_public_company_logo(text) from public;
grant execute on function public.is_public_company_logo(text) to anon,authenticated;
drop policy if exists public_company_logos on storage.objects;
create policy public_company_logos on storage.objects for select to anon,authenticated
using(bucket_id='pulso-files' and public.is_public_company_logo(name));
-- Only the eleven already-public demos explicitly approved by the owner.
update public.companies set universe_visible=true where id in ('fd313ee7-4671-45ec-8403-210d4005689c','b6f0abd3-9a05-485e-94c1-719c0af43290','60c49b90-34ba-4e1c-bf8d-893ad90360ee','240ddd5e-8c60-48b5-ba12-fba89b9ecb04','92e478f6-b5fa-4874-875f-74eea9c589fd','623ad1d2-9947-4e8a-be54-4159f8523b44','292eef78-2dbe-4ba9-a7cc-3248e48b2013','9ba0bd91-2371-465f-8cc7-5b8588768227','631dabc0-08e3-4751-96f8-29fce57d3bd5','26a7159b-82e4-4aa0-aaa8-6898d43e5ffb','00a0be43-661d-40c1-a971-f6fdcee51cd0');
update public.projects set universe_visible=true where id in ('ef754ba3-5c63-4e95-879a-d8591c6755cf','22d55d81-6dd2-42eb-b7e3-e710f969e3dc','ee303714-a0e5-4920-a59b-eeff25d4f0a5','ff0f7b1c-6020-479d-b20d-dc64c26430ec','c8be11aa-c0e6-4b3f-9485-b0ed594c2563','86801432-502c-4b75-a86c-25353691dae3','1318a8ef-b84e-41d3-a214-9a4d808912f8','61443469-5312-40d3-b3b7-9fe517834b05','a571f854-7e0d-4cd0-875f-210938e6313d','e9e9a22c-2115-454b-883c-70c8be51d567','430a58db-72f2-439f-9803-9ee650464da0');
notify pgrst,'reload schema';
commit;
