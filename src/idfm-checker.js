// IDFM PRIM API Checker (GTFS-RT & SIRI-SX)
import { BUS_LINE, isInCommuteWindow, resolveTrip } from "./schedule.js";

const IDFM_PRIM_API_KEY = process.env.IDFM_PRIM_TOKEN || "";
const GTFS_RT_URL = "https://api-lab-prim.iledefrance-mobilites.fr/gtfs-rt/trip-updates";
const SIRI_SX_URL = "https://api-lab-prim.iledefrance-mobilites.fr/siri-lite/v2/general-message";

export async function checkIdfmRealtimeAlerts() {
  const alertsFound = [];

  // Check SIRI-SX Traffic Messages if API token is available
  if (IDFM_PRIM_API_KEY) {
    try {
      const res = await fetch(`${SIRI_SX_URL}?LineRef=STIF:Line::C01746:`, {
        headers: { "apiKey": IDFM_PRIM_API_KEY }
      });
      if (res.ok) {
        const data = await res.json();
        const messages = data?.Siri?.ServiceDelivery?.GeneralMessageDelivery?.[0]?.GeneralMessage || [];
        for (const msg of messages) {
          const content = msg?.Content?.MessageText?.[0]?.value || "";
          if (content.includes("5150") || content.includes("supprim") || content.includes("annul")) {
            // Find time in text
            const timeMatch = content.match(/(\d{1,2})[h:](\d{2})/i);
            const timeStr = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : null;
            if (!timeStr || isInCommuteWindow(timeStr)) {
              alertsFound.push({
                title: `🚨 IDFM Info Trafic: Bus ${BUS_LINE}`,
                description: content,
                tripInfo: resolveTrip(timeStr),
                source: "IDFM PRIM SIRI-SX"
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn("Notice: SIRI-SX API query skipped or token missing:", err.message);
    }
  }

  return alertsFound;
}
