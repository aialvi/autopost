import test from "node:test";
import assert from "node:assert/strict";
import { getDemoApiResponse } from "../src/lib/demo/api";
import { DEMO_USER_ID, DEMO_BRAND_IDS } from "../src/lib/demo/config";
const brand = DEMO_BRAND_IDS[0];
const request = (path: string, method = "GET") => new Request(`http://localhost${path}`, { method });

test("demo fixtures require the signed demo identity and return no-store responses", async () => {
  assert.equal(getDemoApiResponse(undefined, request("/api/brands")), null);
  assert.equal(getDemoApiResponse("ordinary-user", request("/api/brands")), null);
  const response = getDemoApiResponse(DEMO_USER_ID, request("/api/brands"))!;
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  const brands = await response.json();
  assert.equal(brands.length, 3); assert.ok(brands.every((brand: { userRole: string }) => brand.userRole === "viewer"));
});
test("every demo mutation and non-demo brand request is rejected before data access", () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) assert.equal(getDemoApiResponse(DEMO_USER_ID, request(`/api/brands/${brand}/notifications`, method))!.status, 403);
  assert.equal(getDemoApiResponse(DEMO_USER_ID, request("/api/brands/11111111-1111-4111-8111-111111111111/profit"))!.status, 403);
});
test("demo reports reject invalid dates, unknown attribution models and unsupported routes", () => {
  for (const query of ["startDate=2026-02-30&endDate=2026-03-01", "startDate=2026-10-15&endDate=2026-10-01", "startDate=2020-01-01&endDate=2026-01-01"]) assert.equal(getDemoApiResponse(DEMO_USER_ID, request(`/api/brands/${brand}/profit?${query}`))!.status, 400);
  assert.equal(getDemoApiResponse(DEMO_USER_ID, request(`/api/brands/${brand}/attribution?model=unknown`))!.status, 400);
  assert.equal(getDemoApiResponse(DEMO_USER_ID, request(`/api/brands/${brand}/unknown`))!.status, 404);
});
