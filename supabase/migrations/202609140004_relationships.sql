create function public.preserve_project_company() returns trigger language plpgsql set search_path=public as $$
begin
 if new.company_id<>old.company_id then raise exception 'La empresa de un proyecto no se puede cambiar. Creá otro proyecto para conservar su historial.';end if;
 return new;
end $$;
create trigger preserve_project_company before update on public.projects for each row execute function public.preserve_project_company();
create function public.check_attachment_scope() returns trigger language plpgsql set search_path=public as $$
declare linked_company uuid;
begin
 if new.post_id is not null then
  select company_id into linked_company from posts where id=new.post_id;
  if new.company_id is not null and new.company_id is distinct from linked_company then raise exception 'El adjunto corresponde a otra empresa.';end if;
  new.company_id:=linked_company;
 end if;
 return new;
end $$;
create trigger check_attachment_scope before insert on public.attachments for each row execute function public.check_attachment_scope();
alter function public.preserve_creator() set search_path=public;
