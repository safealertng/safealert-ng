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
    const { convoyId, eventType, memberName, routeName, excludeUserId } = await req.json();

    if (!convoyId || !eventType) {
      return new Response(JSON.stringify({ error: "Missing convoyId or eventType" }), {
        status: 400, headers: corsHeaders
      });
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

    const { data: members } = await supabase
      .from("convoy_members")
      .select("user_id")
      .eq("convoy_id", convoyId);

    const userIds = [...new Set((members || []).map((m) => m.user_id))]
      .filter((id) => id !== excludeUserId);

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: corsHeaders });
    }

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .in("user_id", userIds);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: corsHeaders });
    }

    const name = memberName || "A convoy member";
    const route = routeName || "the route";
    const body = eventType === "distress"
      ? `🆘 DISTRESS ALERT from ${name} on ${route} — convoy needs help!`
      : `🚨 ${name}'s vehicle has STOPPED on ${route}. Check on them!`;

    const payload = JSON.stringify({
      title: "SafeAlert NG — Safe Convoy",
      body,
      convoyId,
    });

    let sent = 0;
    const staleEndpoints: string[] = [];
    const results = await Promise.allSettled(
      subscriptions.map(({ subscription }) => webpush.sendNotification(subscription, payload))
    );

    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        sent++;
      } else if (r.reason?.statusCode === 404 || r.reason?.statusCode === 410) {
        staleEndpoints.push(subscriptions[i].subscription.endpoint);
      }
    });

    if (staleEndpoints.length > 0) {
      await supabase.from("push_subscriptions").delete().in("subscription->>endpoint", staleEndpoints);
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: corsHeaders
    });
  }
});
