# GitHub Actions

CI runs on pushes and pull requests to `main` and `develop`. It installs the frozen pnpm lockfile with Node 24 and runs ESLint, TypeScript, isolated backend tests, a production build, and desktop/mobile browser/API tests. CI uses synthetic environment values and the read-only demo; no production secrets or database access are required.

The other workflows and their jobs are preserved but temporarily opt-in. Without the corresponding repository variable set to `true`, GitHub marks their jobs **skipped**, not failed. Nothing is deleted, and real CI failures are not suppressed.

Set repository variables under **Settings → Secrets and variables → Actions → Variables** when ready:

| Variable | Workflow | Required setup before enabling |
| --- | --- | --- |
| `ENABLE_PRODUCTION_DEPLOY` | Deploy | Vercel token, organization/project IDs, deployment environment and application secrets |
| `ENABLE_GITHUB_PLATFORM_SYNC` | Sync Ad Platforms | Application URL, cron secret, connected accounts; Vercel cron already covers sync, so avoid running both schedulers |
| `ENABLE_DATABASE_MIGRATIONS` | Database Migration | Explicit database credentials and review of the manual migration direction |
| `ENABLE_DEPENDENCY_REVIEW` | Dependency Review | GitHub dependency graph/review availability and review of dependency findings |
| `ENABLE_CODEQL_SCAN` | CodeQL | GitHub code scanning availability and an advanced setup compatible with the repository's security settings |

Those optional workflows are not claimed to be verified while skipped. Before enabling them, review their service configuration and commands. Database integration tests are also opt-in through `TEST_DATABASE_URL`; see `tests/README.md`.
