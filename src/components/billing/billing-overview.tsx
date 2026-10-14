"use client";

import useSWR from "swr";
import { fetchJSON } from "@/lib/utils/fetch-json";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Download,
  Loader2,
} from "lucide-react";

interface Invoice {
  id: string;
  status: string;
  currency: string;
  total: number;
  dueDate: Date | null;
  paidAt: Date | null;
  polarInvoiceUrl: string | null;
  createdAt: Date;
}

interface BillingOverviewProps {
  brandId: string;
}

export function BillingOverview({ brandId }: BillingOverviewProps) {
  const { data: subscription, error: subscriptionError, isLoading: subscriptionLoading } = useSWR<{
    tier: string; status: string; currentPeriodEnd: Date | null; cancelAtPeriodEnd: boolean;
  }>(`/api/brands/${brandId}/billing/subscription`, fetchJSON);
  const { data, error: invoicesError, isLoading: invoicesLoading } = useSWR<{ invoices: Invoice[] }>(
    `/api/brands/${brandId}/billing/invoices`, fetchJSON,
  );
  const invoices = data?.invoices ?? [];
  const isLoading = subscriptionLoading || invoicesLoading;
  const error = subscriptionError || invoicesError;

  const formatCurrency = (amount: number, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
      case "paid":
        return (
          <Badge variant="default" className="bg-green-500">
            {status === "paid" ? "Paid" : "Active"}
          </Badge>
        );
      case "trialing":
        return (
          <Badge variant="secondary" className="bg-blue-500">
            Trial
          </Badge>
        );
      case "canceled":
        return (
          <Badge variant="secondary">
            Canceled
          </Badge>
        );
      case "past_due":
        return (
          <Badge variant="destructive">
            Past Due
          </Badge>
        );
      case "open":
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-600">
            Due
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error.message}</p>}
      {/* Subscription Status */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
            <CardDescription>Your current billing status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold capitalize">
                    {subscription.tier}
                  </span>
                  {getStatusBadge(subscription.status)}
                </div>
                {subscription.currentPeriodEnd && (
                  <p className="text-sm text-muted-foreground">
                    Renews on {formatDate(subscription.currentPeriodEnd)}
                  </p>
                )}
                {subscription.cancelAtPeriodEnd && (
                  <p className="text-sm text-yellow-600">
                    Your subscription will cancel at the end of the billing period
                  </p>
                )}
              </div>
              <Button variant="outline" asChild>
                <a href="mailto:support@autopost.app">Contact Support</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Payment history and receipts</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No invoices yet
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">
                        {formatCurrency(invoice.total, invoice.currency)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(invoice.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(invoice.status)}
                    {invoice.polarInvoiceUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a
                          href={invoice.polarInvoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          PDF
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
