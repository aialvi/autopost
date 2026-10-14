# AutoPost test suite

Run these from the repository root with Node 24 and pnpm.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test
pnpm test:e2e
```

`pnpm test` runs isolated Node/TypeScript tests. It does not load `.env.local` or use a development/production database. Database tests report skips unless `TEST_DATABASE_URL` is explicitly set.

`pnpm test:e2e` runs Chromium desktop and mobile browser tests plus API checks. It starts the app on port 3000, or reuses an existing local server. Demo mode must be enabled on a reused server. Tests use fresh browser contexts and the read-only demo; they never purchase subscriptions, connect external accounts, or send Telegram messages. Playwright saves failure screenshots and traces in ignored `test-results/`; open the report with `pnpm exec playwright show-report`.

```sh
# Verify an existing deployment instead of starting a local server:
PLAYWRIGHT_BASE_URL=https://your-deployment.vercel.app pnpm test:e2e
# Independently run the 59-assertion authenticated demo HTTP matrix:
DEMO_TEST_URL=http://localhost:3000 pnpm test:demo
# Interactive test runner:
pnpm test:e2e:ui
```

For database integration tests, create `.env.test.local` with `TEST_DATABASE_URL` pointing to a separate Neon test branch with the application schema already migrated, then run `pnpm test:integration`. These tests insert uniquely named fixtures and delete them in `finally`. They exercise real SQL, membership isolation, accounting, and idempotent syncs, with external provider/Telegram calls mocked. Never point this variable at production.

## Coverage

| Area | Tests |
| --- | --- |
| Registration/login | Password validation, confirmation, retained form values, show password, protected route redirect, demo credentials, sign-out |
| Brands and permissions | Three sample brands, persisted switching, comparison, read-only settings, owner/manager/viewer permissions, cross-tenant and demo isolation |
| Profit | Refunds, COGS fallback, fees, ad spend, recurring expense periods, zero denominators, SQL grouping, timezones, daily/weekly/monthly aggregation, chart axes and negative/zero baseline |
| Shopify | Host validation, pagination, raw-body HMAC and malformed signatures |
| Meta/Google/TikTok/Snapchat | Contract-shaped mocked API responses, money units, purchase values, pagination, advertiser IDs, API errors, repeat-sync idempotency |
| Attribution and CAPI | All models, report totals, campaign data, platform filters, restricted mutations |
| AI | Missing configuration, validated provider output, malformed-output fallback, sample insights and recommendations |
| Notifications | Preference validation, ownership-field injection, quiet hours/timezones, concurrent delivery deduplication, failed-delivery logs, history pagination |
| Billing | Demo subscription/invoices, checkout/cancellation restrictions, missing/invalid webhook signatures, signed raw-body/timestamp verification |
| Security and jobs | Authentication matrix for protected APIs, all demo mutations rejected, token encryption/redaction, cron bearer checks, unsigned webhook rejection |
| UX | Landing anchors and previews, FAQ, demo CTA, mobile menu/Escape focus, no-JS content, 320–1440px overflow checks, active tabs, report failure/retry state |

Live OAuth/credentials, provider permissions, real webhook deliveries, paid checkout, real AI latency/quality, and Telegram delivery need configured sandbox/live accounts and remain separate from automated mocked checks. The suite does not claim those live flows have been verified.
