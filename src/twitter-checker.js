// Twitter / X Announcement Parser for SQYBUS (@SQY_IDFM) - All-Trip & Line 5150 Support
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

export async function checkTwitterAlerts(allTripsMode = true) {
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
        
        // Cancellation keywords used by @SQY_IDFM
        const isCancelMatch = lowerText.includes("ne sera pas assur") || 
                              lowerText.includes("non assur") || 
                              lowerText.includes("supprim") || 
                              lowerText.includes("annul");

        if (isCancelMatch) {
          // Extract line number
          const lineMatch = rawText.match(/Ligne\s*(\d+)|line\s*(\d+)|#Ligne(\d+)|(\d{4})/i);
          const lineNum = lineMatch ? (lineMatch[1] || lineMatch[2] || lineMatch[3] || lineMatch[4]) : "5150";

          // Extract time
          const timeMatch = rawText.match(/(\d{1,2})[h:](\d{2})/i);
          const timeStr = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : null;

          const isBus5150 = lineNum === BUS_LINE || rawText.includes("5150");

          if (isBus5150) {
            // Bus 5150 alert!
            const trip = resolveTrip(timeStr);
            alertsFound.push({
              title: `🚨 X (@${TWITTER_HANDLE}) — BUS 5150 SUPPRIMÉ`,
              description: rawText,
              tripInfo: trip,
              source: `X / Twitter (@${TWITTER_HANDLE})`,
              color: 0xEF4444 // Red
            });
          } else if (allTripsMode) {
            // Temporary all-trip monitoring mode: show alert for other SQY bus lines
            alertsFound.push({
              title: `🟧 X (@${TWITTER_HANDLE}) — BUS ${lineNum} SUPPRIMÉ`,
              description: rawText,
              tripInfo: timeStr ? { direction: `Ligne ${lineNum}`, gaudi: timeStr, sqy: timeStr } : null,
              source: `X / Twitter (@${TWITTER_HANDLE}) • Mode Temporaire Tous Trajets`,
              color: 0xF97316 // Orange
            });
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
