// Main Entry Point for IDFM 5150 Discord Alert Bot
import { sendDiscordAlert } from "./discord.js";
import { checkIdfmRealtimeAlerts } from "./idfm-checker.js";
import { checkTwitterAlerts } from "./twitter-checker.js";
import { resolveTrip } from "./schedule.js";

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";
const IS_TEST = process.argv.includes("--test");

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

  // 2. Check Twitter / X Feed
  const twitterAlerts = await checkTwitterAlerts();

  const allAlerts = [...idfmAlerts, ...twitterAlerts];

  if (allAlerts.length === 0) {
    console.log("✅ Check finished. No canceled trips detected for Bus 5150 in active commute windows.");
    return;
  }

  // Send alerts to Discord Webhook
  for (const alert of allAlerts) {
    await sendDiscordAlert(alert, DISCORD_WEBHOOK_URL);
  }

  console.log(`🎉 Check finished. Dispatched ${allAlerts.length} alert(s) to Discord.`);
}

run().catch(err => {
  console.error("❌ Unexpected error running IDFM Bus 5150 Monitor:", err);
  process.exit(1);
});
