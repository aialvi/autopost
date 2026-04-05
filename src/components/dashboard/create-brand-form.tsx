"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function CreateBrandForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          timezone: formData.get("timezone") || "UTC",
          currency: formData.get("currency") || "USD",
          defaultCogsPercentage: formData.get("defaultCogsPercentage") || "0.00",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create brand");
      }

      const brand = await response.json();
      router.push(`/dashboard/brands/${brand.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create brand");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create New Brand</CardTitle>
        <CardDescription>
          Set up a new brand to track your advertising performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Brand Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="My Brand"
              required
              minLength={2}
            />
          </div>

          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              name="timezone"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              defaultValue="UTC"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT/BST)</option>
              <option value="Europe/Paris">Central European (CET)</option>
              <option value="Asia/Tokyo">Japan (JST)</option>
              <option value="Australia/Sydney">Sydney (AEDT)</option>
            </select>
          </div>

          <div>
            <Label htmlFor="currency">Currency</Label>
            <select
              id="currency"
              name="currency"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              defaultValue="USD"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="CAD">CAD - Canadian Dollar</option>
              <option value="AUD">AUD - Australian Dollar</option>
              <option value="JPY">JPY - Japanese Yen</option>
            </select>
          </div>

          <div>
            <Label htmlFor="defaultCogsPercentage">
              Default COGS Percentage
            </Label>
            <Input
              id="defaultCogsPercentage"
              name="defaultCogsPercentage"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="0.00"
              defaultValue="0.00"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Used when product cost is not available
            </p>
          </div>

          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Creating..." : "Create Brand"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
