// Main Entry Point for IDFM 5150 Discord Alert Bot
import { sendDiscordAlert } from "./discord.js";
import { checkIdfmRealtimeAlerts } from "./idfm-checker.js";
import { checkTwitterAlerts } from "./twitter-checker.js";
import { resolveTrip } from "./schedule.js";

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";
const IS_TEST = process.argv.includes("--test");
const IS_MANUAL_RUN = process.env.GITHUB_EVENT_NAME === "workflow_dispatch" || process.argv.includes("--force");

async function run() {
  console.log("🚀 Starting IDFM Bus 5150 Monitor check...");

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

  // 1. Check IDFM PRIM Open Data API
  const idfmAlerts = await checkIdfmRealtimeAlerts();

  // 2. Check Twitter / X Feed (@SQY_IDFM)
  const twitterAlerts = await checkTwitterAlerts();

  const rawAlerts = [...idfmAlerts, ...twitterAlerts];

  // Deduplicate alerts by trip key so you only get ONE single notification per canceled trip!
  const uniqueAlertsMap = new Map();
  for (const alert of rawAlerts) {
    const key = alert.tripInfo 
      ? `${alert.tripInfo.direction}-${alert.tripInfo.gaudi}` 
      : alert.description.substring(0, 50);
      
    if (!uniqueAlertsMap.has(key)) {
      uniqueAlertsMap.set(key, alert);
    }
  }

  const deduplicatedAlerts = Array.from(uniqueAlertsMap.values());

  if (deduplicatedAlerts.length > 0) {
    console.log(`🚨 Detected ${deduplicatedAlerts.length} unique canceled trip alert(s)! Dispatching to Discord...`);
    for (const alert of deduplicatedAlerts) {
      await sendDiscordAlert(alert, DISCORD_WEBHOOK_URL);
    }
    console.log("🎉 Unique canceled trip alerts sent to Discord.");
    return;
  }

  // If no canceled trips were found...
  console.log("✅ Check finished. No canceled trips detected for Bus 5150 in active commute windows.");

  // If triggered MANUALLY by user ("Run workflow" button), send a status report to Discord!
  if (IS_MANUAL_RUN) {
    console.log("📱 Manual run detected: Sending status report to Discord...");
    await sendDiscordAlert({
      title: "🟢 Vérification Manuelle Bus 5150",
      description: "Aucun trajet supprimé détecté. Tous les bus 5150 de vos plages horaires circulent normalement.",
      source: "Vérification Manuelle • IDFM 5150 Monitor",
      color: 0x10B981 // Green
    }, DISCORD_WEBHOOK_URL);
  }
}

run().catch(err => {
  console.error("❌ Unexpected error running IDFM Bus 5150 Monitor:", err);
  process.exit(1);
});
