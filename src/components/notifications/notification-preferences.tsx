"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Send, Check, X, Loader2 } from "lucide-react";

export interface NotificationPreferences {
  enabled: boolean;
  telegramChatId: string | null;
  alertOnLowRoas: boolean;
  alertOnSpendSpike: boolean;
  alertOnRevenueDrop: boolean;
  alertOnNewOrder: boolean;
  alertOnDailySummary: boolean;
  alertOnWeeklySummary: boolean;
  lowRoasThreshold: string;
  spendSpikeThreshold: string;
  revenueDropThreshold: string;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
}

interface NotificationPreferencesProps {
  brandId: string;
  initialPreferences?: NotificationPreferences | null;
  isViewer?: boolean;
  onSave?: (prefs: NotificationPreferences) => void;
}

const timezones = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Asia/Dubai",
  "Australia/Sydney",
];

export function NotificationPreferences({
  brandId,
  initialPreferences,
  isViewer = false,
  onSave,
}: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    initialPreferences || {
      enabled: true,
      telegramChatId: null,
      alertOnLowRoas: true,
      alertOnSpendSpike: true,
      alertOnRevenueDrop: true,
      alertOnNewOrder: false,
      alertOnDailySummary: true,
      alertOnWeeklySummary: true,
      lowRoasThreshold: "1.0",
      spendSpikeThreshold: "50",
      revenueDropThreshold: "20",
      quietHoursStart: null,
      quietHoursEnd: null,
      timezone: "UTC",
    }
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (initialPreferences) {
      setPreferences(initialPreferences);
    }
  }, [initialPreferences]);

  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (isViewer) return;

    setIsSaving(true);
    setSaveStatus("idle");

    try {
      const response = await fetch(`/api/brands/${brandId}/notifications`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        setSaveStatus("success");
        onSave?.(preferences);
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch (error) {
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!preferences.telegramChatId) return;

    setIsTesting(true);
    setTestStatus("idle");

    try {
      const response = await fetch(`/api/brands/${brandId}/notifications/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: preferences.telegramChatId }),
      });

      if (response.ok) {
        setTestStatus("success");
        setTimeout(() => setTestStatus("idle"), 3000);
      } else {
        setTestStatus("error");
      }
    } catch (error) {
      setTestStatus("error");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Telegram Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Telegram Connection
          </CardTitle>
          <CardDescription>
            Connect your Telegram to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chatId">Telegram Chat ID</Label>
            <div className="flex gap-2">
              <Input
                id="chatId"
                placeholder="123456789"
                value={preferences.telegramChatId || ""}
                onChange={(e) => updatePreference("telegramChatId", e.target.value || null)}
                disabled={isViewer || isSaving}
              />
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={!preferences.telegramChatId || isTesting || isViewer}
              >
                {isTesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : testStatus === "success" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : testStatus === "error" ? (
                  <X className="h-4 w-4 text-red-500" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              To get your chat ID, start a chat with{" "}
              <a
                href="https://t.me/userinfobot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                @userinfobot
              </a>{" "}
              on Telegram or send{" "}
              <code className="px-1 py-0.5 bg-muted rounded text-xs">/start</code> to our bot.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Turn all notifications on or off
              </p>
            </div>
            <Switch
              checked={preferences.enabled}
              onCheckedChange={(checked) => updatePreference("enabled", checked)}
              disabled={isViewer}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={preferences.timezone}
              onValueChange={(value) => updatePreference("timezone", value)}
              disabled={isViewer}
            >
              <SelectTrigger id="timezone" className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz} itemValue={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alert Types */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Types</CardTitle>
          <CardDescription>
            Choose which alerts you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "alertOnLowRoas", label: "Low ROAS Alert", description: "When ROAS falls below threshold" },
            { key: "alertOnSpendSpike", label: "Spend Spike Alert", description: "Unusual increase in ad spend" },
            { key: "alertOnRevenueDrop", label: "Revenue Drop Alert", description: "Significant decrease in revenue" },
            { key: "alertOnNewOrder", label: "New Order Alert", description: "Every time a new order comes in" },
            { key: "alertOnDailySummary", label: "Daily Summary", description: "End of day report" },
            { key: "alertOnWeeklySummary", label: "Weekly Summary", description: "Weekly performance report" },
          ].map((alert) => (
            <div
              key={alert.key}
              className="flex items-center justify-between py-2"
            >
              <div className="space-y-0.5">
                <Label>{alert.label}</Label>
                <p className="text-sm text-muted-foreground">
                  {alert.description}
                </p>
              </div>
              <Switch
                checked={preferences[alert.key as keyof NotificationPreferences] as boolean}
                onCheckedChange={(checked) =>
                  updatePreference(alert.key as keyof NotificationPreferences, checked)
                }
                disabled={isViewer || !preferences.enabled}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Thresholds</CardTitle>
          <CardDescription>
            Customize when alerts are triggered
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lowRoas">Low ROAS Threshold</Label>
            <div className="flex items-center gap-2">
              <Input
                id="lowRoas"
                type="number"
                step="0.1"
                min="0"
                className="w-[100px]"
                value={preferences.lowRoasThreshold}
                onChange={(e) => updatePreference("lowRoasThreshold", e.target.value)}
                disabled={isViewer || !preferences.enabled}
              />
              <span className="text-sm text-muted-foreground">x</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Alert when ROAS falls below this value
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="spendSpike">Spend Spike Threshold</Label>
            <div className="flex items-center gap-2">
              <Input
                id="spendSpike"
                type="number"
                step="5"
                min="0"
                max="100"
                className="w-[100px]"
                value={preferences.spendSpikeThreshold}
                onChange={(e) => updatePreference("spendSpikeThreshold", e.target.value)}
                disabled={isViewer || !preferences.enabled}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Alert when daily spend increases by this percentage
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="revenueDrop">Revenue Drop Threshold</Label>
            <div className="flex items-center gap-2">
              <Input
                id="revenueDrop"
                type="number"
                step="5"
                min="0"
                max="100"
                className="w-[100px]"
                value={preferences.revenueDropThreshold}
                onChange={(e) => updatePreference("revenueDropThreshold", e.target.value)}
                disabled={isViewer || !preferences.enabled}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Alert when revenue drops by this percentage
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Quiet Hours</CardTitle>
          <CardDescription>
            Disable notifications during specific hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quietStart">Start Time</Label>
              <Input
                id="quietStart"
                type="time"
                value={preferences.quietHoursStart || ""}
                onChange={(e) => updatePreference("quietHoursStart", e.target.value || null)}
                disabled={isViewer || !preferences.enabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quietEnd">End Time</Label>
              <Input
                id="quietEnd"
                type="time"
                value={preferences.quietHoursEnd || ""}
                onChange={(e) => updatePreference("quietHoursEnd", e.target.value || null)}
                disabled={isViewer || !preferences.enabled}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            No notifications will be sent between these hours (based on your timezone)
          </p>
        </CardContent>
      </Card>

      {/* Actions */}
      {!isViewer && (
        <div className="flex justify-end gap-2">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : saveStatus === "success" ? (
              <Check className="h-4 w-4 mr-2" />
            ) : null}
            {saveStatus === "success" ? "Saved!" : isSaving ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      )}
    </div>
  );
}
