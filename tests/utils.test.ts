import test from "node:test";
import assert from "node:assert/strict";
import { appUrl } from "../src/lib/utils/app-url";
import { fetchJSON } from "../src/lib/utils/fetch-json";

test("application links select the canonical production host with a local fallback", () => {
  const names = ["NEXT_PUBLIC_APP_URL", "VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL"] as const;
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  try {
    for (const name of names) delete process.env[name];
    assert.equal(appUrl(), "http://localhost:3000");
    process.env.VERCEL_URL = "preview.example.invalid";
    assert.equal(appUrl(), "https://preview.example.invalid");
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "app.example.invalid";
    assert.equal(appUrl(), "https://app.example.invalid");
    process.env.NEXT_PUBLIC_APP_URL = "https://custom.example.invalid/";
    assert.equal(appUrl(), "https://custom.example.invalid");
  } finally { for (const name of names) { if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name]; } }
});
test("report fetcher returns data and surfaces API errors", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ revenue: 123 }));
    assert.deepEqual(await fetchJSON("https://test.invalid"), { revenue: 123 });
    globalThis.fetch = async () => new Response(JSON.stringify({ error: "Temporarily unavailable" }), { status: 503 });
    await assert.rejects(() => fetchJSON("https://test.invalid"), /Temporarily unavailable/);
  } finally { globalThis.fetch = original; }
});
