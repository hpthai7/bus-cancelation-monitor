// Main Entry Point for IDFM 5150 Discord Alert Bot
import { sendDiscordAlert } from "./discord.js";
import { checkIdfmRealtimeAlerts } from "./idfm-checker.js";
import { checkTwitterAlerts } from "./twitter-checker.js";
import { resolveTrip } from "./schedule.js";

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";
const IS_TEST = process.argv.includes("--test");
const IS_MANUAL_RUN = process.env.GITHUB_EVENT_NAME === "workflow_dispatch" || process.argv.includes("--force");

// Set to false: monitor ONLY Bus 5150 commute trips
const ALL_TRIPS_TEMPORARY_MODE = false;

async function run() {
  console.log("🚀 Starting IDFM Bus 5150 Monitor check (IDFM PRIM APIs + SIRI-Lite + X)...");

  if (IS_TEST) {
    console.log("🧪 TEST MODE: Sending sample Discord test alert...");
    const sampleTrip = resolveTrip("07:30");
    await sendDiscordAlert({
      title: "🧪 Test Alerte Discord - Bus 5150",
      description: "Ceci est un message de test pour vérifier la bonne réception des notifications Discord sur votre téléphone Android.",
      tripInfo: sampleTrip,
      source: "Test Système • IDFM 5150 Monitor",
      color: 0x3B82F6 // Blue
    }, DISCORD_WEBHOOK_URL);
    console.log("🎉 Test completed.");
    return;
  }

  // 1. Check IDFM PRIM Open Data API (Line 5150 Mode)
  const idfmAlerts = await checkIdfmRealtimeAlerts(ALL_TRIPS_TEMPORARY_MODE);

  // 2. Check X Feed (@SQY_IDFM) (Line 5150 Mode)
  const twitterAlerts = await checkTwitterAlerts(ALL_TRIPS_TEMPORARY_MODE);

  const rawAlerts = [...idfmAlerts, ...twitterAlerts];

  // Deduplicate alerts by title/description
  const uniqueAlertsMap = new Map();
  for (const alert of rawAlerts) {
    const key = alert.tripInfo 
      ? `${alert.title}-${alert.tripInfo.gaudi}` 
      : alert.description.substring(0, 60);
      
    if (!uniqueAlertsMap.has(key)) {
      uniqueAlertsMap.set(key, alert);
    }
  }

  const deduplicatedAlerts = Array.from(uniqueAlertsMap.values());

  if (deduplicatedAlerts.length > 0) {
    console.log(`🚨 Detected ${deduplicatedAlerts.length} cancellation alert(s)! Dispatching to Discord...`);
    for (const alert of deduplicatedAlerts) {
      await sendDiscordAlert(alert, DISCORD_WEBHOOK_URL);
    }
    console.log("🎉 Cancellation alerts sent to Discord.");
    return;
  }

  console.log("✅ Check finished. No Bus 5150 cancellation alerts detected at this moment.");

  // If triggered MANUALLY by user ("Run workflow" button), send a status report to Discord!
  if (IS_MANUAL_RUN) {
    console.log("📱 Manual run detected: Sending status report to Discord...");
    await sendDiscordAlert({
      title: "🟢 Vérification Manuelle — Bus 5150 Monitor Actif",
      description: "Le moniteur Bus 5150 est actif et vérifie la ligne 5150 toutes les 5 minutes (SIRI-Lite, Disruptions Bulk, API IDFM & X @SQY_IDFM).",
      source: "Vérification Manuelle • IDFM 5150 Monitor",
      color: 0x10B981 // Green
    }, DISCORD_WEBHOOK_URL);
  }
}

run().catch(err => {
  console.error("❌ Unexpected error running IDFM Bus Monitor:", err);
  process.exit(1);
});
