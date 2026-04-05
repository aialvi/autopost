# AutoPost Deployment Guide

## Environment Variables

Configure the following environment variables for deployment:

### Required
- `DATABASE_URL` - PostgreSQL connection string (Neon recommended)
- `AUTH_SECRET` - Secret for session encryption (generate with `openssl rand -base64 32`)
- `NEXT_PUBLIC_APP_URL` - Your app's public URL

### Optional (OAuth)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

### Platform Integrations
- `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET`
- `META_APP_ID` / `META_APP_SECRET`
- `SNAPCHAT_CLIENT_ID` / `SNAPCHAT_CLIENT_SECRET`
- `GOOGLE_ADS_DEVELOPER_TOKEN`
- `TIKTOK_APP_ID` / `TIKTOK_APP_SECRET`

### Payments (Polar.sh)
- `POLAR_ACCESS_TOKEN`
- `POLAR_WEBHOOK_SECRET`
- `POLAR_STARTER_PRODUCT_ID`
- `POLAR_PRO_PRODUCT_ID`
- `POLAR_ENTERPRISE_PRODUCT_ID`

### Notifications
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`

## Vercel Deployment

1. Fork/Clone this repository
2. Connect to Vercel
3. Configure environment variables
4. Deploy

```bash
npm install
npm run build
vercel --prod
```

## Database Setup

```bash
# Generate database client
npm run db:generate

# Push schema to database
npm run db:push

# Open Drizzle Studio (optional)
npm run db:studio
```

## Cron Jobs

AutoPost includes scheduled jobs for:
- Daily summary notifications (6 PM UTC)
- Weekly summary notifications (6 PM UTC, Mondays)
- Anomaly checking (every 2 hours)

These are configured in `vercel.json` and run automatically on Vercel.

## Manual Sync

You can trigger platform syncs manually:

```bash
node scripts/sync-platform.js all      # Sync all platforms
node scripts/sync-platform.js meta     # Sync only Meta
node scripts/sync-platform.js shopify  # Sync only Shopify
```

## Production Checklist

- [ ] Database created and connected
- [ ] Environment variables configured
- [ ] OAuth providers set up (if using)
- [ ] Platform API keys configured
- [ ] Telegram bot created (if using notifications)
- [ ] Polar.sh products created (if accepting payments)
- [ ] Vercel project connected
- [ ] Custom domain configured (optional)
- [ ] Monitoring/error tracking set up (optional)

## Monitoring

Consider integrating:
- Sentry for error tracking
- Vercel Analytics for performance
- Log drains for centralized logging
