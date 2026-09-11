// Vercel Serverless Endpoint: /api/check
import { checkIdfmRealtimeAlerts } from "../src/idfm-checker.js";
import { checkTwitterAlerts } from "../src/twitter-checker.js";
import { sendDiscordAlert } from "../src/discord.js";

export default async function handler(req, res) {
  const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";

  try {
    const idfmAlerts = await checkIdfmRealtimeAlerts();
    const twitterAlerts = await checkTwitterAlerts();
    const allAlerts = [...idfmAlerts, ...twitterAlerts];

    if (allAlerts.length > 0) {
      for (const alert of allAlerts) {
        await sendDiscordAlert(alert, DISCORD_WEBHOOK_URL);
      }
    }

    return res.status(200).json({
      success: true,
      alertsFound: allAlerts.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("Vercel endpoint error:", err);
    return res.status(500).json({ error: err.message });
  }
}
