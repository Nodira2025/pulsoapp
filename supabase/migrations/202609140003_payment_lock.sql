-- Lock the installment inside the trigger without granting clients permission
-- to change the agreed installment amount or its original creator.
create or replace function public.check_payment_balance() returns trigger language plpgsql security definer set search_path=public as $$
declare total numeric; paid numeric;
begin
 select amount into total from installments where id=new.installment_id for update;
 select coalesce(sum(amount),0) into paid from payments where installment_id=new.installment_id;
 if paid+new.amount>total then raise exception 'El pago supera el saldo pendiente de la cuota.';end if;
 return new;
end $$;
revoke all on function public.check_payment_balance() from public,anon,authenticated;
