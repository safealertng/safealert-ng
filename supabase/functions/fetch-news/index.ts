import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const queries = [
      "Nigeria security attack",
      "Nigeria kidnapping",
      "Nigeria bandit",
      "Nigeria police arrest",
      "Nigeria army operation",
    ];

    const allArticles = [];

    for (const query of queries) {
      const encoded = encodeURIComponent(query + " Nigeria");
      const rssUrl = `https://news.google.com/rss/search?q=${encoded}&hl=en-NG&gl=NG&ceid=NG:en`;
      
      const res = await fetch(rssUrl);
      const xml = await res.text();

      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
      
      for (const item of items.slice(0, 3)) {
        const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || 
                      item.match(/<title>(.*?)<\/title>/)?.[1] || "";
        const link = item.match(/<link>(.*?)<\/link>/)?.[1] || "";
        const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
        const source = item.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || "Google News";

        if (title) {
          allArticles.push({
            id: Math.random().toString(36).substr(2, 9),
            headline: title.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
            source,
            link,
            time: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            state: "Nigeria",
            category: query.includes("kidnap") ? "kidnap" : 
                      query.includes("bandit") ? "banditry" :
                      query.includes("attack") ? "alert" : "alert",
            urgent: false,
            body: "",
            from_api: true,
          });
        }
      }
    }

    const seen = new Set();
    const unique = allArticles.filter(a => {
      if (seen.has(a.headline)) return false;
      seen.add(a.headline);
      return true;
    });

    return new Response(JSON.stringify({ articles: unique.slice(0, 20) }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ articles: [], error: err.message }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});