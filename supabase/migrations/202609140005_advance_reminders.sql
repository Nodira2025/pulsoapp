-- Reuses the existing minute cron and push dispatcher. No client polling required.
begin;
create or replace function public.queue_due_reminders() returns void language plpgsql security definer set search_path=public as $$
declare m record;p record;t record;i record;k text;inserted text;begin
 for m in select * from meetings where status='scheduled' and starts_at>=now()-interval '5 minutes' and starts_at<=now()+make_interval(mins=>reminder_minutes) loop
  for p in select * from profiles where active and id=any(m.attendees) loop
   k:='meeting:'||m.id||':'||m.starts_at||':'||p.id;
   inserted:=null;insert into reminder_log(key) values(k) on conflict do nothing returning key into inserted;
   if inserted is not null then insert into notifications(recipient_id,title,body,href) values(p.id,'Tu próxima reunión',m.title||' · '||to_char(m.starts_at at time zone 'America/Argentina/Buenos_Aires','DD/MM HH24:MI'),'/agenda?reunion='||m.id);end if;
  end loop;
 end loop;
 if (now() at time zone 'America/Argentina/Buenos_Aires')::time >= time '09:00' then
  -- Calendar-day reminder at 09:00 Argentina, in addition to the personal lead time.
  -- A 24-hour personal reminder already covers the day before.
  for m in select * from meetings where status='scheduled' and reminder_minutes<1440 and (starts_at at time zone 'America/Argentina/Buenos_Aires')::date=(now() at time zone 'America/Argentina/Buenos_Aires')::date+1 loop
   for p in select * from profiles where active and id=any(m.attendees) loop
    k:='meeting-daybefore:'||m.id||':'||m.starts_at||':'||p.id;
    inserted:=null;insert into reminder_log(key) values(k) on conflict do nothing returning key into inserted;
    if inserted is not null then insert into notifications(recipient_id,title,body,href) values(p.id,'Mañana tenés una reunión',m.title||' · '||to_char(m.starts_at at time zone 'America/Argentina/Buenos_Aires','DD/MM HH24:MI'),'/agenda?reunion='||m.id);end if;
   end loop;
  end loop;

  for t in select * from tasks where status<>'done' and due_date<=(now() at time zone 'America/Argentina/Buenos_Aires')::date+1 and exists(select 1 from profiles where id=tasks.assignee_id and active) loop
   k:='task:'||t.id||':'||(now() at time zone 'America/Argentina/Buenos_Aires')::date;
   inserted:=null;insert into reminder_log(key) values(k) on conflict do nothing returning key into inserted;
   if inserted is not null then insert into notifications(recipient_id,title,body,href) values(t.assignee_id,case when t.due_date<(now() at time zone 'America/Argentina/Buenos_Aires')::date then 'Tenés una tarea atrasada' when t.due_date=(now() at time zone 'America/Argentina/Buenos_Aires')::date then 'Una tarea vence hoy' else 'Una tarea vence mañana' end,t.title,'/proyectos/'||t.project_id);end if;
  end loop;
  for i in select ins.*,pr.owner_id from installments ins join projects pr on pr.id=ins.project_id where ins.due_date<=(now() at time zone 'America/Argentina/Buenos_Aires')::date+1 and exists(select 1 from profiles where id=pr.owner_id and active) and ins.amount>(select coalesce(sum(amount),0) from payments where installment_id=ins.id) loop
   k:='installment:'||i.id||':'||(now() at time zone 'America/Argentina/Buenos_Aires')::date;
   inserted:=null;insert into reminder_log(key) values(k) on conflict do nothing returning key into inserted;
   if inserted is not null then insert into notifications(recipient_id,title,body,href) values(i.owner_id,case when i.due_date=(now() at time zone 'America/Argentina/Buenos_Aires')::date+1 then 'Una cuota vence mañana' when i.due_date=(now() at time zone 'America/Argentina/Buenos_Aires')::date then 'Una cuota vence hoy' else 'Una cuota está vencida' end,i.title||' · Vencimiento '||to_char(i.due_date,'DD/MM'),'/cobros');end if;
  end loop;
 end if;
end $$;
revoke all on function public.queue_due_reminders() from public,anon,authenticated;
grant execute on function public.queue_due_reminders() to service_role;

commit;
