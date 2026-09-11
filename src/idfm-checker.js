// Verified IDFM PRIM API Checker (Navitia Line Reports & Disruptions)
import { BUS_LINE, isInCommuteWindow, resolveTrip } from "./schedule.js";

const IDFM_PRIM_API_KEY = process.env.IDFM_PRIM_TOKEN || "";
const LINE_5150_REPORTS_URL = "https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia/lines/line:IDFM:C01746/line_reports";
const PRIM_DISRUPTIONS_URL = "https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia/disruptions";

export async function checkIdfmRealtimeAlerts(allTripsMode = true) {
  const alertsFound = [];

  if (!IDFM_PRIM_API_KEY) {
    console.warn("⚠️ Notice: IDFM_PRIM_TOKEN secret not set on GitHub. Skipping PRIM API check.");
    return alertsFound;
  }

  // 1. Query Official IDFM PRIM Navitia Line Reports for Line 5150
  try {
    const res = await fetch(LINE_5150_REPORTS_URL, {
      headers: { "apiKey": IDFM_PRIM_API_KEY }
    });

    if (res.ok) {
      const data = await res.json();
      const disruptions = data?.disruptions || [];

      for (const d of disruptions) {
        const messages = (d?.messages || []).map(m => m?.text || "").join(" ");
        const lowerText = messages.toLowerCase();

        const isCancelMatch = lowerText.includes("supprim") || lowerText.includes("annul") || lowerText.includes("non assur") || lowerText.includes("pas assur");

        if (isCancelMatch) {
          const timeMatch = messages.match(/(\d{1,2})[h:](\d{2})/i);
          const timeStr = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : null;

          alertsFound.push({
            title: `🚨 IDFM PRIM API — BUS 5150 SUPPRIMÉ`,
            description: messages,
            tripInfo: resolveTrip(timeStr),
            source: "IDFM PRIM Official Open Data API (Line C01746)",
            color: 0xEF4444 // Red
          });
        }
      }
    }
  } catch (err) {
    console.warn("Notice: PRIM Line Reports API query error:", err.message);
  }

  // 2. Query General Disruptions API for all network lines
  if (allTripsMode) {
    try {
      const res = await fetch(`${PRIM_DISRUPTIONS_URL}?count=50`, {
        headers: { "apiKey": IDFM_PRIM_API_KEY }
      });

      if (res.ok) {
        const data = await res.json();
        const disruptions = data?.disruptions || [];

        for (const d of disruptions) {
          const messages = (d?.messages || []).map(m => m?.text || "").join(" ");
          const lowerText = messages.toLowerCase();

          const isCancelMatch = lowerText.includes("supprim") || lowerText.includes("annul") || lowerText.includes("non assur") || lowerText.includes("pas assur");

          if (isCancelMatch) {
            const lineMatch = messages.match(/Ligne\s*(\d+)|line\s*(\d+)|#Ligne(\d+)|(\d{4})/i);
            const lineNum = lineMatch ? (lineMatch[1] || lineMatch[2] || lineMatch[3] || lineMatch[4]) : "Réseau";
            const isBus5150 = lineNum === BUS_LINE || messages.includes("5150");

            if (!isBus5150) {
              const timeMatch = messages.match(/(\d{1,2})[h:](\d{2})/i);
              const timeStr = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : null;

              alertsFound.push({
                title: `🟧 IDFM PRIM API — BUS ${lineNum} SUPPRIMÉ`,
                description: messages,
                tripInfo: timeStr ? { direction: `Ligne ${lineNum}`, gaudi: timeStr, sqy: timeStr } : null,
                source: "IDFM PRIM API • Mode Temporaire Tous Trajets",
                color: 0xF97316 // Orange
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn("Notice: PRIM General Disruptions API query error:", err.message);
    }
  }

  return alertsFound;
}
