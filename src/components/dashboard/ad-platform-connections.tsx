"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Platform = "meta" | "snapchat" | "google" | "tiktok";

interface AdPlatformConnectionProps {
  brandId: string;
  canEdit: boolean;
}

interface Connection {
  id: string;
  platform: string;
  accountId: string;
  lastSyncedAt: string | null;
  status: string;
}

interface PlatformInfo {
  id: Platform;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const platforms: PlatformInfo[] = [
  {
    id: "meta",
    name: "Meta (Facebook/Instagram)",
    description: "Connect your Facebook & Instagram ad accounts",
    icon: "M",
    color: "bg-blue-600",
  },
  {
    id: "snapchat",
    name: "Snapchat Ads",
    description: "Connect your Snapchat ad account",
    icon: "S",
    color: "bg-yellow-500",
  },
  {
    id: "google",
    name: "Google Ads",
    description: "Connect your Google Ads account",
    icon: "G",
    color: "bg-red-600",
  },
  {
    id: "tiktok",
    name: "TikTok Ads",
    description: "Connect your TikTok ad account",
    icon: "T",
    color: "bg-black",
  },
];

export function AdPlatformConnections({ brandId, canEdit }: AdPlatformConnectionProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState<Platform | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  // Form fields
  const [accessToken, setAccessToken] = useState("");
  const [accountId, setAccountId] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [developerToken, setDeveloperToken] = useState("");
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");

  useEffect(() => {
    fetchConnections();
  }, [brandId]);

  async function fetchConnections() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/brands/${brandId}/sync`);
      const data = await response.json();
      setConnections(data.connections || []);
    } catch (err) {
      setError("Failed to fetch connections");
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlatform) return;

    setConnecting(true);
    setError(null);

    try {
      const response = await fetch(`/api/brands/${brandId}/connections/${selectedPlatform}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getPlatformPayload()),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect");
      }

      setShowDialog(false);
      resetForm();
      fetchConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setConnecting(false);
    }
  }

  function getPlatformPayload() {
    const base = { accessToken, accountId };

    switch (selectedPlatform) {
      case "meta":
        return base;
      case "snapchat":
        return { ...base, clientId, clientSecret, refreshToken };
      case "google":
        return {
          developerToken,
          clientId,
          clientSecret,
          refreshToken,
          customerId: accountId,
        };
      case "tiktok":
        return { appId, appSecret, accessToken };
      default:
        return base;
    }
  }

  function resetForm() {
    setAccessToken("");
    setAccountId("");
    setRefreshToken("");
    setClientId("");
    setClientSecret("");
    setDeveloperToken("");
    setAppId("");
    setAppSecret("");
  }

  async function handleDisconnect(platform: string) {
    if (!confirm(`Are you sure you want to disconnect your ${platform} account?`)) {
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const response = await fetch(`/api/brands/${brandId}/connections/${platform}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }

      fetchConnections();
    } catch (err) {
      setError("Failed to disconnect");
    } finally {
      setConnecting(false);
    }
  }

  async function handleSync(platform: Platform) {
    setSyncing(platform);
    setError(null);

    try {
      const response = await fetch(`/api/brands/${brandId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Sync failed");
      }

      alert(`Sync complete: ${data.result.campaigns} campaigns, ${data.result.ads} ads, ${data.result.snapshots} snapshots, ${data.result.errors} errors`);
      fetchConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(null);
    }
  }

  function getConnection(platform: Platform) {
    return connections.find((c) => c.platform === platform);
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Ad Platform Integrations</h2>
          <p className="text-sm text-muted-foreground">
            Connect your ad accounts to sync campaign data
          </p>
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {platforms.map((platform) => {
          const connection = getConnection(platform.id);
          return (
            <Card key={platform.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${platform.color} flex items-center justify-center text-white font-semibold`}>
                      {platform.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">{platform.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {platform.description}
                      </CardDescription>
                    </div>
                  </div>
                  {connection && (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      connection.status === "active"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                    }`}>
                      {connection.status}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {connection ? (
                  <div className="space-y-3">
                    <div className="text-sm">
                      <p className="font-medium">{connection.accountId}</p>
                      <p className="text-xs text-muted-foreground">
                        {connection.lastSyncedAt
                          ? `Last synced: ${new Date(connection.lastSyncedAt).toLocaleString()}`
                          : "Not synced yet"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSync(platform.id)}
                        disabled={syncing === platform.id || !canEdit}
                      >
                        {syncing === platform.id ? "Syncing..." : "Sync Now"}
                      </Button>
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnect(platform.id)}
                          disabled={connecting}
                          className="text-destructive hover:text-destructive"
                        >
                          Disconnect
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Not connected
                    </p>
                    {canEdit && (
                      <Dialog open={showDialog && selectedPlatform === platform.id} onOpenChange={(open) => {
                        setShowDialog(open);
                        if (open) {
                          setSelectedPlatform(platform.id);
                        } else {
                          setSelectedPlatform(null);
                          resetForm();
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button size="sm">Connect</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Connect {platform.name}</DialogTitle>
                            <DialogDescription>
                              Enter your {platform.name} API credentials
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleConnect} className="space-y-4">
                            {platform.id === "meta" && (
                              <>
                                <div>
                                  <Label htmlFor="accountId">Ad Account ID</Label>
                                  <Input
                                    id="accountId"
                                    placeholder="act_123456789"
                                    value={accountId}
                                    onChange={(e) => setAccountId(e.target.value)}
                                    required
                                    disabled={connecting}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="accessToken">Access Token</Label>
                                  <Input
                                    id="accessToken"
                                    type="password"
                                    placeholder="Your access token"
                                    value={accessToken}
                                    onChange={(e) => setAccessToken(e.target.value)}
                                    required
                                    disabled={connecting}
                                  />
                                </div>
                              </>
                            )}

                            {platform.id === "snapchat" && (
                              <>
                                <div>
                                  <Label htmlFor="clientId">Client ID</Label>
                                  <Input
                                    id="clientId"
                                    placeholder="Your Snapchat Client ID"
                                    value={clientId}
                                    onChange={(e) => setClientId(e.target.value)}
                                    required
                                    disabled={connecting}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="clientSecret">Client Secret</Label>
                                  <Input
                                    id="clientSecret"
                                    type="password"
                                    placeholder="Your Snapchat Client Secret"
                                    value={clientSecret}
                                    onChange={(e) => setClientSecret(e.target.value)}
                                    required
                                    disabled={connecting}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="accessToken">Access Token</Label>
                                  <Input
                                    id="accessToken"
                                    type="password"
                                    placeholder="Your access token"
                                    value={accessToken}
                                    onChange={(e) => setAccessToken(e.target.value)}
                                    required
                                    disabled={connecting}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="refreshToken">Refresh Token (Optional)</Label>
                                  <Input
                                    id="refreshToken"
                                    type="password"
                                    placeholder="Your refresh token"
                                    value={refreshToken}
                                    onChange={(e) => setRefreshToken(e.target.value)}
                                    disabled={connecting}
                                  />
                                </div>
                              </>
                            )}

                            {platform.id === "google" && (
                              <>
                                <div>
                                  <Label htmlFor="customerId">Customer ID</Label>
                                  <Input
                                    id="customerId"
                                    placeholder="123-456-7890"
                                    value={accountId}
                                    onChange={(e) => setAccountId(e.target.value)}
                                    required
                                    disabled={connecting}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="developerToken">Developer Token</Label>
                                  <Input
                                    id="developerToken"
                                    type="password"
                                    placeholder="Your developer token"
                                    value={developerToken}
                                    onChange={(e) => setDeveloperToken(e.target.value)}
                                    required
                                    disabled={connecting}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="clientId">Client ID</Label>
                                  <Input
                                    id="clientId"
                                    placeholder="Your Google Client ID"
                                    value={clientId}
                                    onChange={(e) => setClientId(e.target.value)}
                                    required
                                    disabled={connecting}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="clientSecret">Client Secret</Label>
                                  <Input
                                    id="clientSecret"
                                    type="password"
                                    placeholder="Your Google Client Secret"
                                    value={clientSecret}
                                    onChange={(e) => setClientSecret(e.target.value)}
                                    required
                                    disabled={connecting}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="refreshToken">Refresh Token</Label>
                                  <Input
                                    id="refreshToken"
                                    type="password"
                                    placeholder="Your refresh token"
                                    value={refreshToken}
                                    onChange={(e) => setRefreshToken(e.target.value)}
                                    required
                                    disabled={connecting}
                                  />
                                </div>
                              </>
                            )}

                            {platform.id === "tiktok" && (
                              <>
                                <div>
                                  <Label htmlFor="appId">App ID</Label>
                                  <Input
                                    id="appId"
                                    placeholder="Your TikTok App ID"
                                    value={appId}
                                    onChange={(e) => setAppId(e.target.value)}
                                    required
                                    disabled={connecting}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="appSecret">App Secret</Label>
                                  <Input
                                    id="appSecret"
                                    type="password"
                                    placeholder="Your TikTok App Secret"
                                    value={appSecret}
                                    onChange={(e) => setAppSecret(e.target.value)}
                                    required
                                    disabled={connecting}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="accessToken">Access Token</Label>
                                  <Input
                                    id="accessToken"
                                    type="password"
                                    placeholder="Your access token"
                                    value={accessToken}
                                    onChange={(e) => setAccessToken(e.target.value)}
                                    required
                                    disabled={connecting}
                                  />
                                </div>
                              </>
                            )}

                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowDialog(false)}
                                disabled={connecting}
                              >
                                Cancel
                              </Button>
                              <Button type="submit" disabled={connecting}>
                                {connecting ? "Connecting..." : "Connect"}
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
