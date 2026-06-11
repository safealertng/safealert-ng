import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webPush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("Function called! Method:", req.method);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const body = await req.json();
    console.log("Request body:", JSON.stringify(body));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("subscription");

    console.log("Subscriptions count:", subscriptions?.length, "Error:", error?.message);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: corsHeaders });
    }

    webPush.setVapidDetails(
      "mailto:lordfosterinc@gmail.com",
      Deno.env.get("VAPID_PUBLIC_KEY")!,
      Deno.env.get("VAPID_PRIVATE_KEY")!
    );

    const payload = JSON.stringify({
      title: "PANIC ALERT SafeAlertNG",
      body: "Emergency at " + (body.userLocation || "Unknown") + ". Tap to respond.",
    });

    let sent = 0;
    for (const { subscription } of subscriptions) {
      try {
        await webPush.sendNotification(subscription, payload);
        sent++;
        console.log("Notification sent successfully");
      } catch(e) {
        console.error("Push failed:", e.message);
      }
    }

    console.log("Total sent:", sent);
    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: corsHeaders
    });
  }
});