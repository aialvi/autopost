"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";

interface CAPIEvent {
  id: string;
  platform: string;
  eventName: string;
  eventId: string;
  sentAt: Date;
  responseStatus: string;
  responseBody: string;
}

interface CAPIEventsListProps {
  brandId: string;
}

export function CAPIEventsList({ brandId }: CAPIEventsListProps) {
  const [events, setEvents] = useState<CAPIEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  useEffect(() => {
    fetchEvents();
  }, [brandId, platformFilter]);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const url = new URL(`/api/brands/${brandId}/capi`, window.location.origin);
      if (platformFilter !== "all") {
        url.searchParams.set("platform", platformFilter);
      }

      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error("Error fetching CAPI events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatEventName = (name: string) => {
    return name.replace(/([A-Z])/g, " $1").trim();
  };

  const formatResponse = (status: string, body: string) => {
    if (status === "200" || status === "201") {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <CheckCircle className="h-3 w-3" />
          <span className="text-xs">Success</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-red-600">
        <XCircle className="h-3 w-3" />
        <span className="text-xs">Failed ({status})</span>
      </div>
    );
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>CAPI Events</CardTitle>
            <CardDescription>Recent Conversion API events sent to platforms</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem itemValue="all">All Platforms</SelectItem>
                <SelectItem itemValue="meta">Meta</SelectItem>
                <SelectItem itemValue="snapchat">Snapchat</SelectItem>
                <SelectItem itemValue="google">Google</SelectItem>
                <SelectItem itemValue="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchEvents}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No CAPI events sent yet
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="capitalize">
                    {event.platform}
                  </Badge>
                  <div>
                    <div className="text-sm font-medium">
                      {formatEventName(event.eventName)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ID: {event.eventId.slice(0, 8)}...
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {formatResponse(event.responseStatus, event.responseBody)}
                  <div className="text-xs text-muted-foreground min-w-[50px] text-right">
                    {formatDate(event.sentAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
