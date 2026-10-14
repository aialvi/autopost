import { createHash } from "node:crypto";

// A stable primary key makes repeated/concurrent campaign syncs overwrite the
// same daily snapshot instead of accumulating duplicate spend.
export function snapshotId(brandId: string, platform: string, campaignId: string, date: string): string {
  const hex = createHash("sha256").update([brandId, platform, campaignId, date].join("/")).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
