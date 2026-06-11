import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

serve(async (req) => {
  try {
    const { toUserId, fromName, action } = await req.json();

    if (!toUserId) {
      return new Response(JSON.stringify({ error: "Missing toUserId" }), { status: 400 });
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

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", toUserId);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const name = fromName || "Someone";
    const payload = action === "accepted"
      ? JSON.stringify({
          title: "SafeAlert NG",
          body: `${name} accepted your family request — you're now connected on Family Tracker.`,
        })
      : JSON.stringify({
          title: "SafeAlert NG",
          body: `${name} wants to add you as family on SafeAlertNG.`,
        });

    const results = await Promise.allSettled(
      subscriptions.map(({ subscription }) => webpush.sendNotification(subscription, payload))
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return new Response(JSON.stringify({ sent }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
