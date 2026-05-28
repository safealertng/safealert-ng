import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const NEWS_API_KEY = Deno.env.get("NEWS_API_KEY") || "";

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = `https://newsapi.org/v2/everything?q=nigeria+security+police+army+kidnap+bandit&language=en&sortBy=publishedAt&pageSize=20&apiKey=${NEWS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    const articles = data.articles?.map((a: any) => ({
      id: a.url,
      headline: a.title,
      body: a.description || a.content || "",
      state: "Nigeria",
      category: "alert",
      source: a.source?.name || "News",
      urgent: false,
      time: a.publishedAt,
      url: a.url,
      image: a.urlToImage,
    })) || [];

    return new Response(
      JSON.stringify({ articles }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});