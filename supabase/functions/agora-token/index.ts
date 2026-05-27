import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const APP_ID = "41eb94be47f5488ea60fbb524cec8334";
const APP_CERTIFICATE = Deno.env.get("AGORA_APP_CERTIFICATE") || "";

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { channelName, uid } = await req.json();
    const expireTime = Math.floor(Date.now() / 1000) + 86400;
    const token = APP_CERTIFICATE ? "use_certificate" : null;

    return new Response(
      JSON.stringify({ token, channelName, uid, expireTime }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});