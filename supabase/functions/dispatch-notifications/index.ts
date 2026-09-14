import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const approvedEndpoint = (endpoint: string) => {
  try {
    const u = new URL(endpoint);
    return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') &&
      (u.hostname === 'fcm.googleapis.com' || u.hostname === 'updates.push.services.mozilla.com' || u.hostname === 'web.push.apple.com' || u.hostname.endsWith('.notify.windows.com'));
  } catch { return false; }
};
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const { data: cfg, error: cfgError } = await supabase.rpc('get_push_config');
  if (cfgError || !cfg?.pulso_dispatch_token || !cfg.pulso_vapid_private) return new Response('Push not configured', { status: 503 });
  if (req.headers.get('x-pulso-dispatch') !== cfg.pulso_dispatch_token) return new Response('Unauthorized', { status: 401 });
  webpush.setVapidDetails(cfg.pulso_vapid_subject, cfg.pulso_vapid_public, cfg.pulso_vapid_private);
  const { data: notifications, error } = await supabase.rpc('claim_push_notifications');
  if (error) return new Response('Could not claim notifications', { status: 500 });
  let delivered = 0, failures = 0;
  for (const notice of notifications || []) {
    const { data: subscriptions, error: subscriptionError } = await supabase.from('push_subscriptions').select('*').eq('user_id', notice.recipient_id);
    if (subscriptionError) { failures++; continue; }
    const { data: profile } = await supabase.from('profiles').select('active').eq('id', notice.recipient_id).single();
    let failed = false;
    if (profile?.active) for (const sub of subscriptions || []) {
      if (!approvedEndpoint(sub.endpoint) || sub.subscription?.endpoint !== sub.endpoint) { await supabase.from('push_subscriptions').delete().eq('id', sub.id); continue; }
      const { data: prior, error: priorError } = await supabase.from('push_deliveries').select('notification_id').eq('notification_id', notice.id).eq('subscription_id', sub.id).maybeSingle();
      if (priorError) { failed = true; failures++; continue; }
      if (prior) continue;
      try {
        await webpush.sendNotification(sub.subscription, JSON.stringify({ id: notice.id, title: notice.title, body: notice.body, href: notice.href }), { TTL: 3600, timeout: 8000 });
        const { error: saveError } = await supabase.from('push_deliveries').insert({ notification_id: notice.id, subscription_id: sub.id });
        if (saveError) { failed = true; failures++; } else delivered++;
      } catch (e) {
        const status = (e as {statusCode?:number}).statusCode;
        if (status === 404 || status === 410) await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        else { failed = true; failures++; }
      }
    }
    if (!failed) await supabase.from('notifications').update({ pushed_at: new Date().toISOString(), claimed_until: null }).eq('id', notice.id);
  }
  return Response.json({ claimed: notifications?.length || 0, delivered, failures });
});
