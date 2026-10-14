# AutoPost deployment and live setup

The production project is `aialvis-projects/autopost` on Vercel. Node.js 24 and
pnpm are pinned by the project and package metadata. The demo works immediately;
live services need the credentials below. Automated tests use controlled provider
responses and temporary Neon records, and do not replace live account checks.

## Required production environment

- `DATABASE_URL`: the application's Neon PostgreSQL connection string.
- `AUTH_SECRET`: a long random secret for signed authentication sessions.
- `AUTH_TRUST_HOST=true`: allow Auth.js to use the Vercel deployment hostname.
- `ENCRYPTION_KEY`: 64 hexadecimal characters (32 bytes), used for stored platform
  tokens. Keep this value stable; changing it makes saved encrypted tokens unreadable.
- `CRON_SECRET`: a random secret protecting scheduled-job endpoints.
- `ENABLE_EXPERIMENTAL_COREPACK=1`: use the pinned pnpm version.
- `DEMO_ENABLED=true`: enable the isolated public demo (default). Set `false` to disable.

`NEXT_PUBLIC_APP_URL` can specify a custom canonical URL. Otherwise, server-side
links use Vercel's production hostname. OAuth is optional: configure
`AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` and register the callback
`https://YOUR_HOST/api/auth/callback/google`.

## Connect real stores and advertising accounts

Create your own account, create a brand, and open **Brands → Settings**.
Set the brand's currency, timezone, and default COGS percentage before connecting.
Connect accounts using the same reporting currency as the brand; currency
conversion is not provided.

- **Shopify:** `.myshopify.com` domain and an Admin API access token with order,
  product, and inventory read access. Inventory item costs supply COGS; when
  missing, the brand's default percentage is used. Older orders need the
  additional Shopify order-history permission. Manually sync products before
  orders to populate known product costs.
- **Meta:** access token and the specific ad account ID (with or without `act_`).
- **Google Ads:** customer ID, developer token, OAuth client ID/secret, and refresh token.
- **Snapchat:** ad account ID, access token, OAuth client ID/secret, and optional refresh token.
- **TikTok:** advertiser ID, app ID/secret, and access token. IDs remain strings so
  large advertiser identifiers retain their precision.

Access tokens and private client secrets are encrypted before storage. Connection
GET responses contain display fields and never tokens or private metadata.
Campaign spend and reported purchase revenue update one daily snapshot on repeated
syncs. Platform ROAS uses reported purchase revenue; it does not assume an order value.
Platform attribution windows can overlap. Blended ROAS and profit use synced
Shopify sales after refunds, COGS, recorded fees, ad spend, and custom expenses.
Gateway transaction fees currently use configured gateway-rate estimates; compare
these with your actual payment statements. Returned goods retain their recorded
COGS until their cost records are adjusted.

For real-time Shopify updates, set `SHOPIFY_WEBHOOK_SECRET` and register
`https://YOUR_HOST/api/webhooks/shopify` for order create/update/paid/cancelled,
refund create, and app uninstall events. Webhooks verify HMAC against the raw
body. Refund events read the current authoritative order to avoid double-counting
replayed refund deliveries.

## AI recommendations

Set `AI_PROVIDER=gemini` and `GEMINI_API_KEY`, or `AI_PROVIDER=anthropic` and
`ANTHROPIC_API_KEY`. Models can be overridden with `GEMINI_MODEL` or
`ANTHROPIC_MODEL`. Responses are validated before display. Missing keys, provider
errors, or malformed output produce a clearly labelled performance-rule fallback.
Recommendations are advisory; they do not automatically change advertising budgets.

## Telegram and scheduled jobs

Set `TELEGRAM_BOT_TOKEN`. Start your bot, copy the chat ID, and save it in the
brand's **Notifications** tab. Set thresholds, alert types, quiet hours, and the
notification timezone. The test button sends a real message, so use your own chat.

If enabling bot commands, also set `TELEGRAM_WEBHOOK_SECRET` and register the
Telegram webhook at `https://YOUR_HOST/api/telegram/webhook` with that secret token.

Vercel schedules these authenticated GET routes in production:

| Route | UTC schedule | Behavior |
| --- | --- | --- |
| `/api/cron/sync-platforms` | Hourly at :15 | Up to ten active connections, refreshing today and yesterday's ad metrics |
| `/api/cron/daily-summary` | 18:00 daily | Previous complete local-day summary |
| `/api/cron/weekly-summary` | 18:00 Monday | Previous seven complete local days |
| `/api/cron/check-anomalies` | Every two hours | ROAS, spend spike, and complete-day revenue-drop checks |

Jobs respect per-user preferences, quiet hours, membership, and notification
suppression windows. An atomic log reservation prevents duplicate concurrent sends.
New paid orders can also trigger alerts. Failed deliveries are recorded and surfaced
as job failures. Demo brands and demo sessions never access outbound services.
Jobs use a 300-second function duration; large initial imports should be monitored
and split into smaller ranges if they outgrow that budget.

## Billing (optional)

Configure `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, and the
`POLAR_STARTER_PRODUCT_ID`, `POLAR_PRO_PRODUCT_ID`, and
`POLAR_ENTERPRISE_PRODUCT_ID` values before enabling live paid subscriptions.
The public demo's Pro subscription and invoices are generated samples.

## Verification and deployment

```sh
pnpm install --frozen-lockfile
npm test
pnpm exec playwright install chromium
pnpm test:e2e                 # desktop/mobile browser and API suite
npm run build
npm run test:demo              # running local server required
DEMO_TEST_URL=https://YOUR_HOST npm run test:demo
```

`npm test` checks accounting, date ranges, currency-unit normalization, provider
response parsing, AI response validation, token encryption, webhook HMAC,
notification preferences, cron authorization, and repeated-sync behavior. Neon
integration fixtures are removed after the tests. Run `pnpm test:integration`
with an explicit `TEST_DATABASE_URL` pointing to a migrated test branch.
The default suite never reads the development or production database. The HTTP demo suite checks authentication, populated reports,
filters, pagination, and rejection of all demo mutations.

After automated checks, deploy the linked project with `vercel --prod`. Verify
registration/sign-in, brand switching, report tabs, and the public demo on the
actual production hostname. Then perform live account sync, AI, and Telegram
checks when their credentials have been configured.

The full test coverage matrix and run instructions are in [tests/README.md](tests/README.md).
