begin;
create extension if not exists pgcrypto with schema extensions;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade, username text unique not null check(username ~ '^[a-z0-9_]{3,30}$'), display_name text not null,
 avatar_path text, phone text not null default '', bio text not null default '', role text not null default 'member' check(role in ('admin','member')), active boolean not null default true,
 must_change_password boolean not null default true, reminder_minutes integer not null default 30 check(reminder_minutes between 0 and 10080), created_at timestamptz not null default now()
);
create function public.is_member() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from profiles where id=auth.uid() and active) $$;
create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from profiles where id=auth.uid() and active and role='admin') $$;
create table public.companies (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name))>0), industry text not null default '', contact_name text not null default '', phone text not null default '', email text not null default '', maps_url text not null default '', networks text not null default '', notes text not null default '', logo_path text,
 created_by uuid not null references public.profiles(id) default auth.uid(), created_at timestamptz not null default now()
);
create unique index company_name_unique on public.companies(lower(trim(name)));
create table public.projects (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), name text not null check(length(trim(name))>0), description text not null default '', owner_id uuid not null references public.profiles(id),
 status text not null default 'planning' check(status in ('planning','active','waiting','completed','archived')), priority text not null default 'medium' check(priority in ('low','medium','high')),
 start_date date not null default current_date, end_date date not null default current_date, budget numeric(14,2) not null default 0 check(budget>=0), github_url text not null default '', public_url text not null default '',
 created_by uuid not null references public.profiles(id) default auth.uid(), created_at timestamptz not null default now(), check(end_date>=start_date)
);
create table public.tasks (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), title text not null check(length(trim(title))>0), assignee_id uuid not null references public.profiles(id), start_date date not null default current_date, due_date date not null,
 status text not null default 'todo' check(status in ('todo','doing','blocked','done')), priority text not null default 'medium' check(priority in ('low','medium','high')),
 created_by uuid not null references public.profiles(id) default auth.uid(), created_at timestamptz not null default now(), check(due_date>=start_date)
);
create table public.posts (
 id uuid primary key default gen_random_uuid(), company_id uuid references public.companies(id), project_id uuid references public.projects(id), author_id uuid not null references public.profiles(id) default auth.uid(), responsible_id uuid references public.profiles(id),
 content text not null check(length(trim(content))>0), next_step text not null default '', blocker text not null default '', happened_on date not null default current_date, kind text not null default 'note' check(kind in ('note','update')), mentions uuid[] not null default '{}', created_at timestamptz not null default now()
);
create table public.comments (id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id), author_id uuid not null references public.profiles(id) default auth.uid(), content text not null check(length(trim(content))>0), created_at timestamptz not null default now());
create table public.reactions (post_id uuid not null references public.posts(id), user_id uuid not null references public.profiles(id) default auth.uid(), primary key(post_id,user_id));
create table public.installments (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), title text not null, amount numeric(14,2) not null check(amount>0), due_date date not null, created_by uuid not null references public.profiles(id) default auth.uid(), created_at timestamptz not null default now());
create table public.payments (id uuid primary key default gen_random_uuid(), installment_id uuid not null references public.installments(id), amount numeric(14,2) not null check(amount>0), paid_on date not null default current_date, method text not null, note text not null default '', receipt_path text, created_by uuid not null references public.profiles(id) default auth.uid(), created_at timestamptz not null default now());
create table public.expenses (id uuid primary key default gen_random_uuid(), company_id uuid references public.companies(id), project_id uuid references public.projects(id), category text not null, description text not null, amount numeric(14,2) not null check(amount>0), method text not null, paid_on date not null default current_date, paid_by uuid not null references public.profiles(id), receipt_path text, created_by uuid not null references public.profiles(id) default auth.uid(), created_at timestamptz not null default now());
create table public.meetings (
 id uuid primary key default gen_random_uuid(), company_id uuid references public.companies(id), project_id uuid references public.projects(id), title text not null check(length(trim(title))>0), starts_at timestamptz not null, ends_at timestamptz not null,
 attendees uuid[] not null default '{}', guests text not null default '', location_type text not null default 'virtual' check(location_type in ('virtual','presencial','llamada')), location text not null default '',
 status text not null default 'scheduled' check(status in ('scheduled','completed','cancelled','missed')), notes text not null default '', outcome text not null default '', reminder_minutes integer not null default 30 check(reminder_minutes between 0 and 10080), series_id uuid,
 created_by uuid not null references public.profiles(id) default auth.uid(), created_at timestamptz not null default now(), check(ends_at>starts_at)
);
create table public.meeting_changes (id uuid primary key default gen_random_uuid(), meeting_id uuid not null references public.meetings(id), changed_by uuid references public.profiles(id) default auth.uid(), old_starts_at timestamptz, new_starts_at timestamptz, old_status text, new_status text, created_at timestamptz not null default now());
create table public.attachments (id uuid primary key default gen_random_uuid(), company_id uuid references public.companies(id), post_id uuid references public.posts(id), name text not null, path text, url text, created_by uuid not null references public.profiles(id) default auth.uid(), created_at timestamptz not null default now(), check((path is not null) <> (url is not null)), check(url is null or url ~ '^https?://'), check(company_id is not null or post_id is not null));
create table public.notifications (id uuid primary key default gen_random_uuid(), recipient_id uuid not null references public.profiles(id), title text not null, body text not null default '', href text not null default '/', read_at timestamptz, pushed_at timestamptz, created_at timestamptz not null default now());
create table public.push_subscriptions (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) default auth.uid(), endpoint text unique not null check(endpoint ~ '^https://'), subscription jsonb not null, created_at timestamptz not null default now());
create table public.reminder_log (key text primary key, created_at timestamptz not null default now());

-- Shared workspace: only approved active members can read business data.
do $$ declare t text; begin
 foreach t in array array['profiles','companies','projects','tasks','posts','comments','reactions','installments','payments','expenses','meetings','meeting_changes','attachments','notifications','push_subscriptions','reminder_log'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 end loop;
 foreach t in array array['companies','projects','tasks','installments','payments','expenses','meetings','attachments'] loop
 execute format('grant select,insert on public.%I to authenticated',t);
 execute format('create policy member_read on public.%I for select to authenticated using (public.is_member())',t);
 execute format('create policy member_insert on public.%I for insert to authenticated with check (public.is_member() and created_by=auth.uid())',t);
 end loop;
 foreach t in array array['companies','projects','tasks','meetings'] loop
 execute format('grant update on public.%I to authenticated',t);
 execute format('create policy member_update on public.%I for update to authenticated using (public.is_member()) with check (public.is_member())',t);
 end loop;
 foreach t in array array['posts','comments'] loop
 execute format('grant select,insert on public.%I to authenticated',t);
 execute format('create policy member_read on public.%I for select to authenticated using (public.is_member())',t);
 execute format('create policy author_insert on public.%I for insert to authenticated with check (public.is_member() and author_id=auth.uid())',t);
 end loop;
end $$;
grant select on public.profiles to authenticated;
grant update(display_name,avatar_path,phone,bio,reminder_minutes) on public.profiles to authenticated;
create policy member_read on public.profiles for select to authenticated using(public.is_member());
create policy self_update on public.profiles for update to authenticated using(public.is_member() and id=auth.uid()) with check(id=auth.uid());
grant select,insert,delete on public.reactions to authenticated;
create policy member_read on public.reactions for select to authenticated using(public.is_member());
create policy self_insert on public.reactions for insert to authenticated with check(public.is_member() and user_id=auth.uid());
create policy self_delete on public.reactions for delete to authenticated using(public.is_member() and user_id=auth.uid());
grant select on public.meeting_changes to authenticated;
create policy member_read on public.meeting_changes for select to authenticated using(public.is_member());
grant select on public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;
create policy self_read on public.notifications for select to authenticated using(public.is_member() and recipient_id=auth.uid());
create policy self_update on public.notifications for update to authenticated using(public.is_member() and recipient_id=auth.uid()) with check(recipient_id=auth.uid());
grant select,insert,update,delete on public.push_subscriptions to authenticated;
create policy self_manage on public.push_subscriptions for all to authenticated using(public.is_member() and user_id=auth.uid()) with check(public.is_member() and user_id=auth.uid());

create function public.preserve_creator() returns trigger language plpgsql as $$ begin if new.created_by<>old.created_by or new.created_at<>old.created_at then raise exception 'La autoría y fecha de incorporación no se pueden modificar.'; end if; return new; end $$;
do $$ declare t text; begin foreach t in array array['companies','projects','tasks','meetings'] loop execute format('create trigger preserve_creator before update on public.%I for each row execute function public.preserve_creator()',t); end loop; end $$;
create function public.check_project_company() returns trigger language plpgsql set search_path=public as $$ declare c uuid; begin if new.project_id is not null then select company_id into c from projects where id=new.project_id; if new.company_id is not null and new.company_id<>c then raise exception 'El proyecto pertenece a otra empresa.';end if;new.company_id:=c;end if;return new;end $$;
do $$ declare t text; begin foreach t in array array['posts','expenses','meetings'] loop execute format('create trigger project_company before insert or update on public.%I for each row execute function public.check_project_company()',t); end loop; end $$;
create function public.check_payment_balance() returns trigger language plpgsql set search_path=public as $$ declare total numeric; paid numeric; begin select amount into total from installments where id=new.installment_id for update;select coalesce(sum(amount),0) into paid from payments where installment_id=new.installment_id;if paid+new.amount>total then raise exception 'El pago supera el saldo pendiente de la cuota.';end if;return new;end $$;
create trigger check_payment before insert on public.payments for each row execute function public.check_payment_balance();

create function public.notify_activity() returns trigger language plpgsql security definer set search_path=public as $$
declare who uuid; ids uuid[]; headline text; detail text; dest text;
begin
 if tg_table_name='posts' then ids:=new.mentions;headline:='Te mencionaron en una novedad';detail:=left(new.content,180);dest:='/novedades?post='||new.id;
 elsif tg_table_name='tasks' then
  if tg_op='UPDATE' and new.assignee_id=old.assignee_id then return new;end if;
  ids:=array[new.assignee_id];headline:='Una tarea para vos';detail:=new.title;dest:='/proyectos/'||new.project_id;
 elsif tg_table_name='comments' then select array[author_id] into ids from posts where id=new.post_id;headline:='Nuevo comentario';detail:=left(new.content,180);dest:='/novedades?post='||new.post_id;
 elsif tg_table_name='meetings' then
  if tg_op='UPDATE' then
   if new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at or new.status<>old.status or new.attendees is distinct from old.attendees or new.location is distinct from old.location then
    insert into meeting_changes(meeting_id,old_starts_at,new_starts_at,old_status,new_status) values(new.id,old.starts_at,new.starts_at,old.status,new.status);
    headline:='Se actualizó una reunión';
   else return new;end if;
  else headline:='Nueva reunión';end if;
  ids:=new.attendees;detail:=new.title;dest:='/agenda?reunion='||new.id;
 end if;
 for who in select distinct unnest(ids) loop
  if who is distinct from auth.uid() and exists(select 1 from profiles where id=who and active) then insert into notifications(recipient_id,title,body,href) values(who,headline,detail,dest);end if;
 end loop;return new;
end $$;
create trigger notify_post after insert on public.posts for each row execute function public.notify_activity();
create trigger notify_task after insert or update on public.tasks for each row execute function public.notify_activity();
create trigger notify_comment after insert on public.comments for each row execute function public.notify_activity();
create trigger notify_meeting after insert or update on public.meetings for each row execute function public.notify_activity();

-- Auth creation stays in a narrowly scoped admin-only function. No password is stored in public tables.
create function public.admin_create_member(p_username text,p_name text,p_password text) returns uuid language plpgsql security definer set search_path=public,extensions as $$
declare uid uuid:=gen_random_uuid();mail text;begin
 if not public.is_admin() then raise exception 'Solo un administrador puede agregar usuarios.';end if;
 if p_username !~ '^[a-z0-9_]{3,30}$' or length(p_password)<8 or length(trim(p_name))=0 then raise exception 'Revisá el nombre de usuario y la contraseña (mínimo 8 caracteres).';end if;
 mail:=p_username||'@equipo.pulso.internal';
 insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
 values('00000000-0000-0000-0000-000000000000',uid,'authenticated','authenticated',mail,crypt(p_password,gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,jsonb_build_object('display_name',p_name),now(),now(),'','','','');
 insert into auth.identities(id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at) values(gen_random_uuid(),uid,uid::text,jsonb_build_object('sub',uid::text,'email',mail,'email_verified',true,'phone_verified',false),'email',now(),now(),now());
 insert into profiles(id,username,display_name) values(uid,p_username,p_name);return uid;
end $$;
revoke all on function public.admin_create_member(text,text,text) from public,anon;
grant execute on function public.admin_create_member(text,text,text) to authenticated;
create function public.finish_password_change() returns void language plpgsql security definer set search_path=public as $$ begin if not public.is_member() then raise exception 'Sin acceso';end if;update profiles set must_change_password=false where id=auth.uid();end $$;
revoke all on function public.finish_password_change() from public,anon;
grant execute on function public.finish_password_change() to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('pulso-files','pulso-files',false,20971520,array['image/jpeg','image/png','image/webp','image/gif','application/pdf','text/plain','text/csv','application/zip','application/x-zip-compressed','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation','audio/mpeg','audio/mp4','video/mp4']) on conflict(id) do nothing;
create policy pulso_files_read on storage.objects for select to authenticated using(bucket_id='pulso-files' and public.is_member());
create policy pulso_files_insert on storage.objects for insert to authenticated with check(bucket_id='pulso-files' and public.is_member() and (storage.foldername(name))[1]=auth.uid()::text);

create index projects_company on public.projects(company_id);
create index tasks_project on public.tasks(project_id);
create index tasks_assignee on public.tasks(assignee_id,due_date);
create index posts_company on public.posts(company_id,created_at desc);
create index posts_project on public.posts(project_id,created_at desc);
create index comments_post on public.comments(post_id);
create index installments_project on public.installments(project_id);
create index payments_installment on public.payments(installment_id);
create index meetings_company on public.meetings(company_id,starts_at);
create index meetings_schedule on public.meetings(starts_at) where status='scheduled';
create index notices_recipient on public.notifications(recipient_id,created_at desc);
create index notices_pending_push on public.notifications(created_at) where pushed_at is null;
do $$ declare t text;begin foreach t in array array['profiles','companies','projects','tasks','posts','comments','reactions','installments','payments','expenses','meetings','meeting_changes','attachments','notifications'] loop
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t);end if;
end loop;end $$;
commit;
