// IDFM PRIM API Checker (GTFS-RT & SIRI-SX) - All-Trip & Line 5150 Support
import { BUS_LINE, isInCommuteWindow, resolveTrip } from "./schedule.js";

const IDFM_PRIM_API_KEY = process.env.IDFM_PRIM_TOKEN || "";
const SIRI_SX_URL = "https://api-lab-prim.iledefrance-mobilites.fr/siri-lite/v2/general-message";
const GTFS_RT_URL = "https://api-lab-prim.iledefrance-mobilites.fr/gtfs-rt/trip-updates";

export async function checkIdfmRealtimeAlerts(allTripsMode = true) {
  const alertsFound = [];

  if (!IDFM_PRIM_API_KEY) {
    console.warn("⚠️ Notice: IDFM_PRIM_TOKEN secret not set on GitHub. To enable official IDFM PRIM API checks, add IDFM_PRIM_TOKEN in GitHub secrets.");
    return alertsFound;
  }

  // 1. Query SIRI-SX Info Trafic API for SQY / 5150 lines
  try {
    const res = await fetch(`${SIRI_SX_URL}`, {
      headers: { "apiKey": IDFM_PRIM_API_KEY }
    });
    if (res.ok) {
      const data = await res.json();
      const messages = data?.Siri?.ServiceDelivery?.GeneralMessageDelivery?.[0]?.GeneralMessage || [];
      
      for (const msg of messages) {
        const content = msg?.Content?.MessageText?.[0]?.value || "";
        const lowerText = content.toLowerCase();

        const isCancelMatch = lowerText.includes("supprim") || lowerText.includes("annul") || lowerText.includes("non assur");

        if (isCancelMatch) {
          const lineMatch = content.match(/Ligne\s*(\d+)|line\s*(\d+)|#Ligne(\d+)|(\d{4})/i);
          const lineNum = lineMatch ? (lineMatch[1] || lineMatch[2] || lineMatch[3] || lineMatch[4]) : "5150";
          const isBus5150 = lineNum === BUS_LINE || content.includes("5150");

          const timeMatch = content.match(/(\d{1,2})[h:](\d{2})/i);
          const timeStr = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : null;

          if (isBus5150) {
            alertsFound.push({
              title: `🚨 IDFM PRIM API — BUS 5150 SUPPRIMÉ`,
              description: content,
              tripInfo: resolveTrip(timeStr),
              source: "IDFM PRIM SIRI-SX API",
              color: 0xEF4444 // Red
            });
          } else if (allTripsMode) {
            alertsFound.push({
              title: `🟧 IDFM PRIM API — BUS ${lineNum} SUPPRIMÉ`,
              description: content,
              tripInfo: timeStr ? { direction: `Ligne ${lineNum}`, gaudi: timeStr, sqy: timeStr } : null,
              source: "IDFM PRIM SIRI-SX API • Mode Temporaire Tous Trajets",
              color: 0xF97316 // Orange
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("Notice: SIRI-SX API query error:", err.message);
  }

  return alertsFound;
}
