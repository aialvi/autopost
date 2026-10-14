"use client";

import useSWR from "swr";
import { fetchJSON } from "@/lib/utils/fetch-json";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Bell, CheckCircle, XCircle, Clock } from "lucide-react";

interface NotificationLog {
  id: string;
  type: string;
  channel: string;
  status: string;
  title: string;
  message: string;
  sentAt: Date;
  error?: string;
}

interface NotificationHistoryProps {
  brandId: string;
}

export function NotificationHistory({ brandId }: NotificationHistoryProps) {
  const [page, setPage] = useState(1);
  const limit = 6;
  const { data, error, isLoading, mutate } = useSWR<{ logs: NotificationLog[] }>(
    `/api/brands/${brandId}/notifications/logs?page=${page}&limit=${limit}`, fetchJSON,
  );
  const logs = data?.logs ?? [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "low_roas":
      case "spend_spike":
      case "revenue_drop":
        return "destructive";
      case "daily_summary":
      case "weekly_summary":
        return "secondary";
      case "new_order":
        return "secondary";
      default:
        return "outline";
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return d.toLocaleDateString();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification History
            </CardTitle>
            <CardDescription>Recent notifications sent for this brand</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error.message}</p>}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No notifications sent yet
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 rounded-xl border bg-card p-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted" aria-label={`Delivery ${log.status}`}>{getStatusIcon(log.status)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-5">{log.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant={getTypeColor(log.type)} className="capitalize">
                      {log.type.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs capitalize text-muted-foreground">{log.channel}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{log.message}</p>
                  {log.error && <p className="mt-2 text-xs leading-5 text-red-600">{log.error}</p>}
                  <p className="mt-3 text-xs text-muted-foreground">{formatDate(log.sentAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {!isLoading && (logs.length > 0 || page > 1) && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-xs text-muted-foreground">Page {page}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={logs.length < limit} onClick={() => setPage((current) => current + 1)}>Next</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
