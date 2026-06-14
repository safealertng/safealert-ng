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
    webpush.setVapidDetails(
      "mailto:lordfosterinc@gmail.com",
      Deno.env.get("VAPID_PUBLIC_KEY")!,
      Deno.env.get("VAPID_PRIVATE_KEY")!
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Drains the queue populated by fn_auto_flag_stale_incidents() (cron)
    // and mark_incident_resolved() (admin RPC).
    const { data: queued } = await supabase
      .from("incident_notifications")
      .select("id, reporter_id, kind, resolution_note, incident_created_at")
      .eq("sent", false)
      .limit(100);

    if (!queued || queued.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200, headers: corsHeaders });
    }

    let sent = 0;
    for (const n of queued) {
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("subscription")
        .eq("user_id", n.reporter_id);

      const payload = n.kind === "resolved"
        ? JSON.stringify({
            title: "SafeAlertNG — Report Update",
            body: `Update on your report: ${n.resolution_note || "Your report has been resolved."}`,
          })
        : JSON.stringify({
            title: "SafeAlertNG — Report Reviewed",
            body: `Your report from ${new Date(n.incident_created_at).toLocaleDateString("en-NG")} has been reviewed. No further action was taken.`,
          });

      for (const { subscription } of subscriptions || []) {
        try {
          await webpush.sendNotification(subscription, payload);
          sent++;
        } catch (e) {
          console.error("Push failed:", e.message);
        }
      }

      await supabase.from("incident_notifications").update({ sent: true }).eq("id", n.id);
    }

    return new Response(JSON.stringify({ sent }), { status: 200, headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
