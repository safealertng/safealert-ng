import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RSS_FEEDS = [
  { url: "https://punchng.com/feed", source: "The Punch" },
  { url: "https://www.vanguardngr.com/feed", source: "Vanguard" },
  { url: "https://www.channelstv.com/feed", source: "Channels TV" },
];

const SECURITY_KEYWORDS = [
  "attack", "kidnap", "bandit", "robbery", "shooting", "bomb",
  "terror", "arrest", "security", "police", "army", "militant",
  "abduct", "ransom", "hostage", "crime", "murder", "kill"
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const allArticles = [];

    for (const feed of RSS_FEEDS) {
      try {
        const res = await fetch(feed.url, {
          headers: { "User-Agent": "SafeAlertNG/1.0" }
        });
        const xml = await res.text();

        const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

        for (const item of items.slice(0, 10)) {
          const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
                        item.match(/<title>(.*?)<\/title>/)?.[1] || "";
          const link = item.match(/<link>(.*?)<\/link>/)?.[1] ||
                       item.match(/<guid>(.*?)<\/guid>/)?.[1] || "";
          const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
          const description = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] ||
                              item.match(/<description>(.*?)<\/description>/)?.[1] || "";

          const titleLower = title.toLowerCase();
          const isSecurityRelated = SECURITY_KEYWORDS.some(k => titleLower.includes(k));

          if (title && isSecurityRelated) {
            allArticles.push({
              id: Math.random().toString(36).substr(2, 9),
              headline: title.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/<[^>]+>/g, ""),
              body: description.replace(/<[^>]+>/g, "").substring(0, 200),
              source: feed.source,
              link,
              time: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
              state: "Nigeria",
              category: titleLower.includes("kidnap") || titleLower.includes("abduct") ? "kidnap" :
                        titleLower.includes("bandit") ? "banditry" :
                        titleLower.includes("terror") || titleLower.includes("bomb") ? "terror" :
                        titleLower.includes("rob") ? "robbery" : "alert",
              urgent: titleLower.includes("urgent") || titleLower.includes("breaking"),
              from_api: true,
            });
          }
        }
      } catch (e) {
        console.error(`Error fetching ${feed.source}:`, e);
      }
    }

    const seen = new Set();
    const unique = allArticles.filter(a => {
      if (seen.has(a.headline)) return false;
      seen.add(a.headline);
      return true;
    });

    return new Response(JSON.stringify({ articles: unique.slice(0, 30) }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ articles: [], error: err.message }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});