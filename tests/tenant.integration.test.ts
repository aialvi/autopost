import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

test("brand roles and demo isolation prevent cross-tenant access", { skip: !process.env.DATABASE_URL }, async () => {
  const { db, brands, users, brandUsers } = await import("../src/lib/db");
  const { eq } = await import("drizzle-orm");
  const { hasBrandAccess, canManageBrand, isBrandOwner } = await import("../src/lib/auth/brand-auth");
  const { DEMO_USER_ID, DEMO_BRAND_IDS } = await import("../src/lib/demo/config");
  const brandId = randomUUID();
  const ids = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  await db.insert(brands).values({ id: brandId, name: "Tenant test", slug: `tenant-${brandId}` });
  try {
    for (const id of ids) await db.insert(users).values({ id, email: `tenant-${id}@example.invalid` });
    for (const [index, role] of (["owner", "manager", "viewer"] as const).entries()) await db.insert(brandUsers).values({ brandId, userId: ids[index], role });
    for (const [index, role] of (["owner", "manager", "viewer"] as const).entries()) {
      assert.equal(await hasBrandAccess(ids[index], brandId), role);
      assert.equal(await canManageBrand(ids[index], brandId), index < 2);
      assert.equal(await isBrandOwner(ids[index], brandId), index === 0);
    }
    assert.equal(await hasBrandAccess(ids[3], brandId), null);
    assert.equal(await hasBrandAccess(DEMO_USER_ID, brandId), null);
    assert.equal(await hasBrandAccess(DEMO_USER_ID, DEMO_BRAND_IDS[0]), "viewer");
    assert.equal(await hasBrandAccess(ids[0], DEMO_BRAND_IDS[0]), null);
  } finally {
    await db.delete(brands).where(eq(brands.id, brandId));
    for (const id of ids) await db.delete(users).where(eq(users.id, id));
  }
});
