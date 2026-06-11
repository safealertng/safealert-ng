import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

serve(async (req) => {
  try {
    const { userId, lat, lng, action } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), { status: 400 });
    }

    webpush.setVapidDetails(
      "mailto:lordfosterinc@gmail.com",
      Deno.env.get("VAPID_PUBLIC_KEY")!,
      Deno.env.get("VAPID_PRIVATE_KEY")!
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Only this user's own family tracker contacts who have a SafeAlertNG account
    const { data: contacts } = await supabase
      .from("family_members")
      .select("member_user_id")
      .eq("owner_id", userId)
      .not("member_user_id", "is", null);

    const memberIds = [...new Set((contacts || []).map((c) => c.member_user_id))];
    if (memberIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .in("user_id", memberIds);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const payload = action === "cancel"
      ? JSON.stringify({
          title: "SafeAlert NG",
          body: "Silent SOS cancelled — they're okay now.",
          silent: true,
          fromUserId: userId,
        })
      : JSON.stringify({
          title: "SafeAlert NG",
          body: `Silent SOS — live location: https://maps.google.com/?q=${lat},${lng}`,
          silent: true,
          fromUserId: userId,
        });

    const results = await Promise.allSettled(
      subscriptions.map(({ subscription }) => webpush.sendNotification(subscription, payload))
    );

    let sent = 0;
    const staleEndpoints: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        sent++;
      } else if (r.reason?.statusCode === 404 || r.reason?.statusCode === 410) {
        // Browser unsubscribed or the subscription expired — drop it so
        // future alerts don't keep silently failing for this contact.
        staleEndpoints.push(subscriptions[i].subscription.endpoint);
      }
    });

    if (staleEndpoints.length > 0) {
      await supabase.from("push_subscriptions").delete().in("subscription->>endpoint", staleEndpoints);
    }

    return new Response(JSON.stringify({ sent }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
