// Twitter / X Announcement Parser for SQYBUS (@SQY_IDFM)
import { BUS_LINE, isInCommuteWindow, resolveTrip } from "./schedule.js";

export const TWITTER_HANDLE = "SQY_IDFM";

// Configurable RSS endpoint or fallbacks for @SQY_IDFM
const RSS_ENDPOINTS = [
  process.env.TWITTER_RSS_URL || "",
  `https://nitter.privacydev.net/${TWITTER_HANDLE}/rss`,
  `https://nitter.poast.org/${TWITTER_HANDLE}/rss`,
  `https://nitter.download/${TWITTER_HANDLE}/rss`,
  `https://nitter.cz/${TWITTER_HANDLE}/rss`,
  `https://nitter.x86.men/${TWITTER_HANDLE}/rss`
].filter(Boolean);

export async function checkTwitterAlerts() {
  const alertsFound = [];

  for (const rssUrl of RSS_ENDPOINTS) {
    try {
      const res = await fetch(rssUrl, { 
        headers: { 
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" 
        } 
      });
      if (!res.ok) continue;

      const xmlText = await res.text();
      const itemRegex = /<item>[\s\S]*?<description>([\s\S]*?)<\/description>[\s\S]*?<\/item>/gi;
      let match;

      while ((match = itemRegex.exec(xmlText)) !== null) {
        const rawText = match[1].replace(/<[^>]+>/g, "").trim();
        const lowerText = rawText.toLowerCase();
        
        // Filter for line 5150 & cancellation terms used by @SQY_IDFM
        const isLineMatch = rawText.includes("5150") || rawText.includes("Ligne5150") || rawText.includes("SQY");
        const isCancelMatch = lowerText.includes("ne sera pas assur") || 
                              lowerText.includes("non assur") || 
                              lowerText.includes("supprim") || 
                              lowerText.includes("annul");

        if (isLineMatch && isCancelMatch) {
          const timeMatch = rawText.match(/(\d{1,2})[h:](\d{2})/i);
          const timeStr = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : null;

          if (!timeStr || isInCommuteWindow(timeStr)) {
            alertsFound.push({
              title: `🚨 Twitter @${TWITTER_HANDLE}: Bus ${BUS_LINE} Supprimé`,
              description: rawText,
              tripInfo: resolveTrip(timeStr),
              source: `Twitter / X (@${TWITTER_HANDLE})`
            });
            break; // Matched primary alert
          }
        }
      }
      if (alertsFound.length > 0) break;
    } catch (err) {
      // Ignore fallback mirror errors quietly
    }
  }

  return alertsFound;
}
