begin;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;
alter table public.notifications add column claimed_until timestamptz;
alter table public.push_subscriptions add constraint endpoint_matches_subscription check(subscription->>'endpoint'=endpoint);
create table public.push_deliveries(notification_id uuid not null references public.notifications(id) on delete cascade,subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,created_at timestamptz not null default now(),primary key(notification_id,subscription_id));
alter table public.push_deliveries enable row level security;
revoke all on public.push_deliveries from anon,authenticated;
grant all on public.push_deliveries to service_role;

create function public.get_push_config() returns jsonb language sql security definer set search_path=public,vault as $$ select jsonb_object_agg(name,decrypted_secret) from vault.decrypted_secrets where name in ('pulso_vapid_public','pulso_vapid_private','pulso_dispatch_token','pulso_vapid_subject') $$;
revoke all on function public.get_push_config() from public,anon,authenticated;
grant execute on function public.get_push_config() to service_role;
create function public.claim_push_notifications() returns setof public.notifications language sql security definer set search_path=public as $$
 update notifications set claimed_until=now()+interval '2 minutes' where id in (select id from notifications where pushed_at is null and created_at>now()-interval '24 hours' and (claimed_until is null or claimed_until<now()) order by created_at limit 50 for update skip locked) returning *;
$$;
revoke all on function public.claim_push_notifications() from public,anon,authenticated;
grant execute on function public.claim_push_notifications() to service_role;

create function public.queue_due_reminders() returns void language plpgsql security definer set search_path=public as $$
declare m record;p record;t record;i record;k text;inserted text;begin
 for m in select * from meetings where status='scheduled' and starts_at>=now()-interval '5 minutes' and starts_at<=now()+make_interval(mins=>reminder_minutes) loop
  for p in select * from profiles where active and id=any(m.attendees) loop
   k:='meeting:'||m.id||':'||m.starts_at||':'||p.id;
   inserted:=null;insert into reminder_log(key) values(k) on conflict do nothing returning key into inserted;
   if inserted is not null then insert into notifications(recipient_id,title,body,href) values(p.id,'Tu próxima reunión',m.title||' · '||to_char(m.starts_at at time zone 'America/Argentina/Buenos_Aires','DD/MM HH24:MI'),'/agenda?reunion='||m.id);end if;
  end loop;
 end loop;
 if (now() at time zone 'America/Argentina/Buenos_Aires')::time >= time '09:00' then
  for t in select * from tasks where status<>'done' and due_date<=(now() at time zone 'America/Argentina/Buenos_Aires')::date loop
   k:='task:'||t.id||':'||(now() at time zone 'America/Argentina/Buenos_Aires')::date;
   inserted:=null;insert into reminder_log(key) values(k) on conflict do nothing returning key into inserted;
   if inserted is not null then insert into notifications(recipient_id,title,body,href) values(t.assignee_id,case when t.due_date<(now() at time zone 'America/Argentina/Buenos_Aires')::date then 'Tenés una tarea atrasada' else 'Una tarea vence hoy' end,t.title,'/proyectos/'||t.project_id);end if;
  end loop;
  for i in select ins.*,pr.owner_id from installments ins join projects pr on pr.id=ins.project_id where ins.due_date<=(now() at time zone 'America/Argentina/Buenos_Aires')::date and ins.amount>(select coalesce(sum(amount),0) from payments where installment_id=ins.id) loop
   k:='installment:'||i.id||':'||(now() at time zone 'America/Argentina/Buenos_Aires')::date;
   inserted:=null;insert into reminder_log(key) values(k) on conflict do nothing returning key into inserted;
   if inserted is not null then insert into notifications(recipient_id,title,body,href) values(i.owner_id,'Una cuota está pendiente',i.title||' · Vencimiento '||to_char(i.due_date,'DD/MM'),'/cobros');end if;
  end loop;
 end if;
end $$;
revoke all on function public.queue_due_reminders() from public,anon,authenticated;
grant execute on function public.queue_due_reminders() to service_role;
select cron.schedule('pulso-reminders','* * * * *','select public.queue_due_reminders();');
commit;
