// Discord Webhook Notification Dispatcher

export async function sendDiscordAlert(alertData, webhookUrl) {
  if (!webhookUrl) {
    console.warn("⚠️ DISCORD_WEBHOOK_URL is not set. Skipping Discord alert.");
    return false;
  }

  const { title, description, tripInfo, source, color } = alertData;

  const embed = {
    title: title || "🚨 Alerte Trafic Bus 5150",
    description: description || "Perturbation ou suppression signalée.",
    color: color || 0xEF4444, // Red
    fields: [],
    footer: {
      text: `Source: ${source || "Île-de-France Mobilités / Twitter"} • IDFM 5150 Monitor`
    },
    timestamp: new Date().toISOString()
  };

  if (tripInfo) {
    embed.fields.push(
      { name: "🧭 Sens", value: tripInfo.direction || "Inconnu", inline: true },
      { name: "🚏 Votre Arrêt (Gaudi)", value: `**${tripInfo.gaudi}**`, inline: true },
      { name: "📍 Départ Terminus (SQY)", value: tripInfo.sqy || "—", inline: true }
    );
  }

  embed.fields.push(
    { name: "📡 Source API", value: `\`${source || "Île-de-France Mobilités API"}\``, inline: false }
  );

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Info Bus 5150",
        avatar_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Logo_%C3%8Ele-de-France_Mobilit%C3%A9s.svg/240px-Logo_%C3%8Ele-de-France_Mobilit%C3%A9s.svg.png",
        embeds: [embed]
      })
    });

    if (res.ok) {
      console.log(`✅ Discord alert sent successfully: ${title}`);
      return true;
    } else {
      console.error(`❌ Failed to send Discord alert (HTTP ${res.status}):`, await res.text());
      return false;
    }
  } catch (err) {
    console.error("❌ Error sending Discord webhook:", err);
    return false;
  }
}
