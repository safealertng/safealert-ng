import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

serve(async (req) => {
  try {
    const { userId, userName, lat, lng, location } = await req.json();

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

    // Only this user's own family tracker connections (app-based, not phone)
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

    const name = userName || "A family member";
    const mapsLink = lat && lng ? ` Live location: https://maps.google.com/?q=${lat},${lng}` : "";
    const payload = JSON.stringify({
      title: "🚨 PANIC ALERT — SafeAlertNG",
      body: `${name} triggered a PANIC alert${location ? ` near ${location}` : ""}.${mapsLink}`,
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
