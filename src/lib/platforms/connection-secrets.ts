import { encrypt, decrypt } from "@/lib/utils/encryption";
const PREFIX = "enc:v1:";
export const protectSecret = (value: string) => value ? PREFIX + encrypt(value) : value;
export const revealSecret = (value: string) => value.startsWith(PREFIX) ? decrypt(value.slice(PREFIX.length)) : value;

export function safeConnection(connection: { id: string; platform: string; accountId: string; status: string; lastSyncedAt: Date | null }) {
  return { id: connection.id, platform: connection.platform, accountId: connection.accountId, status: connection.status, lastSyncedAt: connection.lastSyncedAt };
}
