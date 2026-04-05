"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ShopifyConnectionProps {
  brandId: string;
  canEdit: boolean;
}

interface Connection {
  id: string;
  accountId: string;
  lastSyncedAt: string | null;
  status: string;
}

export function ShopifyConnection({ brandId, canEdit }: ShopifyConnectionProps) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [storeDomain, setStoreDomain] = useState("");
  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    fetchConnection();
  }, [brandId]);

  async function fetchConnection() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/brands/${brandId}/connections/shopify`);
      const data = await response.json();
      if (data.connected) {
        setConnection(data.connection);
      } else {
        setConnection(null);
      }
    } catch (err) {
      setError("Failed to fetch connection status");
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true);
    setError(null);

    try {
      const response = await fetch(`/api/brands/${brandId}/connections/shopify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeDomain, accessToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect");
      }

      setShowForm(false);
      setStoreDomain("");
      setAccessToken("");
      fetchConnection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Are you sure you want to disconnect your Shopify store?")) {
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const response = await fetch(`/api/brands/${brandId}/connections/shopify`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }

      setConnection(null);
    } catch (err) {
      setError("Failed to disconnect");
    } finally {
      setConnecting(false);
    }
  }

  async function handleSync(type: "products" | "orders") {
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch(`/api/brands/${brandId}/sync/shopify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Sync failed");
      }

      alert(`Sync complete: ${data.result.created} created, ${data.result.updated} updated, ${data.result.errors} errors`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shopify Integration</CardTitle>
        <CardDescription>
          Connect your Shopify store to sync products and orders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {error}
          </div>
        )}

        {!connection ? (
          !showForm ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                No Shopify store connected. Connect your store to enable product and order sync.
              </p>
              {canEdit && (
                <Button onClick={() => setShowForm(true)}>
                  Connect Shopify Store
                </Button>
              )}
            </div>
          ) : (
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <Label htmlFor="storeDomain">Store Domain</Label>
                <Input
                  id="storeDomain"
                  placeholder="your-store.myshopify.com"
                  value={storeDomain}
                  onChange={(e) => setStoreDomain(e.target.value)}
                  required
                  disabled={!canEdit || connecting}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter your store's myshopify.com domain
                </p>
              </div>

              <div>
                <Label htmlFor="accessToken">Access Token</Label>
                <Input
                  id="accessToken"
                  type="password"
                  placeholder="shpat_xxxxx"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  required
                  disabled={!canEdit || connecting}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Create a custom app in Shopify Admin to get an access token
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  disabled={connecting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!canEdit || connecting}>
                  {connecting ? "Connecting..." : "Connect"}
                </Button>
              </div>
            </form>
          )
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{connection.accountId}</p>
                <p className="text-xs text-muted-foreground">
                  {connection.lastSyncedAt
                    ? `Last synced: ${new Date(connection.lastSyncedAt).toLocaleString()}`
                    : "Not synced yet"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  connection.status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}>
                  {connection.status}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSync("products")}
                disabled={syncing || !canEdit}
              >
                {syncing ? "Syncing..." : "Sync Products"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSync("orders")}
                disabled={syncing || !canEdit}
              >
                {syncing ? "Syncing..." : "Sync Orders"}
              </Button>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={connecting}
                  className="text-destructive hover:text-destructive"
                >
                  Disconnect
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
