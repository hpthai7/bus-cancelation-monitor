// Twitter / X Announcement Parser for SQYBUS / IDFM
import { BUS_LINE, isInCommuteWindow, resolveTrip } from "./schedule.js";

// Uses Nitter RSS bridge or Twitter public RSS endpoints
const TWITTER_RSS_URLS = [
  "https://nitter.net/StQuentin_IDFM/rss",
  "https://nitter.poast.org/StQuentin_IDFM/rss"
];

export async function checkTwitterAlerts() {
  const alertsFound = [];

  for (const rssUrl of TWITTER_RSS_URLS) {
    try {
      const res = await fetch(rssUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) continue;

      const xmlText = await res.text();
      // Match items in RSS xml
      const itemRegex = /<item>[\s\S]*?<description>([\s\S]*?)<\/description>[\s\S]*?<\/item>/gi;
      let match;
      while ((match = itemRegex.exec(xmlText)) !== null) {
        const text = match[1].replace(/<[^>]+>/g, "").trim();
        
        // Filter for line 5150 & cancellation terms
        if ((text.includes("5150") || text.includes("SQYBUS")) && 
            (text.includes("supprim") || text.includes("non assur") || text.includes("annul"))) {
          
          const timeMatch = text.match(/(\d{1,2})[h:](\d{2})/i);
          const timeStr = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : null;

          if (!timeStr || isInCommuteWindow(timeStr)) {
            alertsFound.push({
              title: `🚨 Twitter @StQuentin_IDFM: Bus ${BUS_LINE}`,
              description: text,
              tripInfo: resolveTrip(timeStr),
              source: "Twitter / X (@StQuentin_IDFM)"
            });
            break; // Stop after first match to avoid duplicates
          }
        }
      }
      if (alertsFound.length > 0) break;
    } catch (err) {
      // Ignore network fallback errors quietly
    }
  }

  return alertsFound;
}
