// Public credentials for the isolated, read-only sample workspace.
export const DEMO_EMAIL = "demo@autopost.app";
export const DEMO_PASSWORD = "DemoPass123!";
export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_BRAND_IDS = [
  "00000000-0000-4000-8000-000000000101",
  "00000000-0000-4000-8000-000000000102",
  "00000000-0000-4000-8000-000000000103",
] as const;

export function isDemoEnabled() {
  return process.env.DEMO_ENABLED !== "false";
}

export function isDemoUser(userId: string | undefined | null) {
  return userId === DEMO_USER_ID;
}

export function isDemoBrand(brandId: string) {
  return DEMO_BRAND_IDS.some((id) => id === brandId);
}
