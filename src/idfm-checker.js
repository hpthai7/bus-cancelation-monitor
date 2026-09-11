// Verified IDFM PRIM API Checker (Line 5150, SQY Network, Disruptions Bulk API)
import { BUS_LINE, isInCommuteWindow, resolveTrip } from "./schedule.js";

const IDFM_PRIM_API_KEY = process.env.IDFM_PRIM_TOKEN || "";

// Correct PRIM Line ID for Bus 5150: line:IDFM:C01541
const LINE_5150_REPORTS_URL = "https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia/lines/line:IDFM:C01541/line_reports";

// Network ID for Saint-Quentin-en-Yvelines: network:IDFM:1068
const SQY_NETWORK_REPORTS_URL = "https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia/networks/network:IDFM:1068/line_reports";

// PRIM Disruptions Bulk API (Swagger endpoint)
const PRIM_DISRUPTIONS_BULK_URL = "https://prim.iledefrance-mobilites.fr/marketplace/disruptions_bulk/disruptions/v2";

function cleanText(raw) {
  if (!raw) return "";
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

function extractLineNumber(text) {
  const match = text.match(/(?:Ligne|Line|#Ligne)\s*([A-Z0-9]+)/i);
  if (match) return match[1];
  if (text.includes("5150")) return "5150";
  return "Réseau";
}

function isDisruptionActiveToday(disruption) {
  if (disruption.status && disruption.status !== "active") return false;
  
  const todayYMD = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // e.g. "20260911"
  const periods = disruption.application_periods || disruption.applicationPeriods || [];
  
  if (periods.length === 0) return true;

  for (const p of periods) {
    const begin = (p.begin || "").slice(0, 8);
    const end = (p.end || "").slice(0, 8);
    if (begin && end && begin <= todayYMD && todayYMD <= end) {
      return true;
    }
  }
  return false;
}

export async function checkIdfmRealtimeAlerts(allTripsMode = true) {
  const alertsFound = [];

  if (!IDFM_PRIM_API_KEY) {
    console.warn("⚠️ Notice: IDFM_PRIM_TOKEN secret not set on GitHub. Skipping PRIM API check.");
    return alertsFound;
  }

  // 1. Query Official PRIM Navitia Line Reports for Line 5150 (line:IDFM:C01541)
  try {
    const res = await fetch(LINE_5150_REPORTS_URL, {
      headers: { "apiKey": IDFM_PRIM_API_KEY }
    });

    if (res.ok) {
      const data = await res.json();
      const disruptions = data?.disruptions || [];

      for (const d of disruptions) {
        if (!isDisruptionActiveToday(d)) continue;

        const rawMessages = (d?.messages || []).map(m => m?.text || "").join(" ");
        const messages = cleanText(rawMessages);
        const lowerText = messages.toLowerCase();

        const isCancelMatch = lowerText.includes("supprim") || lowerText.includes("annul") || lowerText.includes("non assur") || lowerText.includes("pas assur");

        if (isCancelMatch) {
          const timeMatch = messages.match(/(\d{1,2})[h:](\d{2})/i);
          const timeStr = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : null;

          alertsFound.push({
            title: `🚨 IDFM PRIM API — BUS 5150 SUPPRIMÉ`,
            description: messages,
            tripInfo: resolveTrip(timeStr),
            source: "IDFM PRIM API (Line C01541)",
            color: 0xEF4444 // Red
          });
        }
      }
    }
  } catch (err) {
    console.warn("Notice: PRIM Line Reports API query error:", err.message);
  }

  // 2. Query SQY Network Line Reports (network:IDFM:1068) for all SQY buses
  if (allTripsMode) {
    try {
      const res = await fetch(SQY_NETWORK_REPORTS_URL, {
        headers: { "apiKey": IDFM_PRIM_API_KEY }
      });

      if (res.ok) {
        const data = await res.json();
        const disruptions = data?.disruptions || [];

        for (const d of disruptions) {
          if (!isDisruptionActiveToday(d)) continue;

          const rawMessages = (d?.messages || []).map(m => m?.text || "").join(" ");
          const messages = cleanText(rawMessages);
          const lowerText = messages.toLowerCase();

          const isCancelMatch = lowerText.includes("supprim") || lowerText.includes("annul") || lowerText.includes("non assur") || lowerText.includes("pas assur");

          if (isCancelMatch) {
            const lineNum = extractLineNumber(messages);
            const isBus5150 = lineNum === BUS_LINE || messages.includes("5150");

            const timeMatch = messages.match(/(\d{1,2})[h:](\d{2})/i);
            const timeStr = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : null;

            alertsFound.push({
              title: isBus5150 ? `🚨 IDFM PRIM API — BUS 5150 SUPPRIMÉ` : `🟧 IDFM PRIM API — BUS ${lineNum} SUPPRIMÉ`,
              description: messages,
              tripInfo: isBus5150 ? resolveTrip(timeStr) : (timeStr ? { direction: `Ligne ${lineNum}`, gaudi: timeStr, sqy: timeStr } : null),
              source: "IDFM PRIM API (Réseau SQY)",
              color: isBus5150 ? 0xEF4444 : 0xF97316
            });
          }
        }
      }
    } catch (err) {
      console.warn("Notice: PRIM SQY Network API query error:", err.message);
    }
  }

  // 3. Query PRIM Disruptions Bulk API (/marketplace/disruptions_bulk/disruptions/v2)
  try {
    const res = await fetch(PRIM_DISRUPTIONS_BULK_URL, {
      headers: { "apiKey": IDFM_PRIM_API_KEY }
    });

    if (res.ok) {
      const data = await res.json();
      const disruptions = data?.disruptions || [];

      for (const d of disruptions) {
        if (!isDisruptionActiveToday(d)) continue;

        const messages = cleanText(`${d.title || ""} ${d.message || ""}`);
        const lowerText = messages.toLowerCase();

        const isCancelMatch = lowerText.includes("supprim") || lowerText.includes("annul") || lowerText.includes("non assur") || lowerText.includes("pas assur");

        if (isCancelMatch) {
          const lineNum = extractLineNumber(messages);
          const isBus5150 = lineNum === BUS_LINE || messages.includes("5150");

          if (isBus5150 || allTripsMode) {
            const timeMatch = messages.match(/(\d{1,2})[h:](\d{2})/i);
            const timeStr = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : null;

            alertsFound.push({
              title: isBus5150 ? `🚨 IDFM DISRUPTIONS BULK — BUS 5150 SUPPRIMÉ` : `🟧 IDFM DISRUPTIONS BULK — BUS ${lineNum} SUPPRIMÉ`,
              description: messages,
              tripInfo: isBus5150 ? resolveTrip(timeStr) : (timeStr ? { direction: `Ligne ${lineNum}`, gaudi: timeStr, sqy: timeStr } : null),
              source: "IDFM PRIM Disruptions Bulk API",
              color: isBus5150 ? 0xEF4444 : 0xF97316
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("Notice: PRIM Disruptions Bulk API query error:", err.message);
  }

  return alertsFound;
}
