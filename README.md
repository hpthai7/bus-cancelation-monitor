# IDFM Bus 5150 Discord Notification Bot

Real-time canceled trip notification bot for **Bus 5150** (Gaudi ↔ Calmette) integrated with **Discord Webhooks** for instant native Android push notifications.

---

## ⚡ Deployment Options (Both 100% Free - 0€)

### Option A: GitHub Actions (Recommended - Simple Setup)
1. Create a free repo on [GitHub.com](https://github.com/new).
2. Push this codebase:
   ```bash
   git init && git add . && git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/idfm-5150-discord-bot.git
   git push -u origin main
   ```
3. In GitHub ➔ **Settings** ➔ **Secrets and variables** ➔ **Actions** ➔ Add Secret:
   - `DISCORD_WEBHOOK_URL`: Your Discord Webhook link.

---

### Option B: Vercel (1-Click Deployment)
1. Import repository to [Vercel.com](https://vercel.com) (Hobby Free Plan).
2. In Vercel Project Settings ➔ **Environment Variables**:
   - `DISCORD_WEBHOOK_URL`: Your Discord Webhook link.
3. Your Vercel API endpoint will be live at `https://your-project.vercel.app/api/check`.
4. *(Optional)* Add a free 2-minute pinger at [cron-job.org](https://cron-job.org) targeting `https://your-project.vercel.app/api/check`.
