import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { toUserId, fromUserId, fromName, action } = await req.json();

    if (!toUserId) {
      return new Response(JSON.stringify({ error: "Missing toUserId" }), { status: 400, headers: corsHeaders });
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
      return new Response(JSON.stringify({ sent: 0 }), { status: 200, headers: corsHeaders });
    }

    const name = fromName || "Someone";
    const body = action === "accepted"
      ? `${name} accepted your family request — you're now connected on Family Tracker.`
      : action === "checkin"
      ? `${name} is checking on you — please respond.`
      : `${name} wants to add you as family on SafeAlertNG.`;
    const payload = JSON.stringify({
      title: "SafeAlert NG",
      body,
      fromUserId: fromUserId || null,
    });

    const results = await Promise.allSettled(
      subscriptions.map(({ subscription }) => webpush.sendNotification(subscription, payload))
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return new Response(JSON.stringify({ sent }), { status: 200, headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
