"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2, CreditCard, Crown, Zap, Building2 } from "lucide-react";
import { PRICING_TIERS, type PricingTier } from "@/lib/payments/polar";
import { CheckCircle } from "lucide-react";

interface SubscriptionCardProps {
  brandId: string;
  currentTier: string;
  userEmail: string;
  isViewer?: boolean;
  onUpgrade?: (tier: PricingTier) => void;
}

const tierIcons: Record<string, React.ReactNode> = {
  free: <CreditCard className="h-6 w-6" />,
  starter: <Zap className="h-6 w-6" />,
  pro: <Crown className="h-6 w-6 text-yellow-500" />,
  enterprise: <Building2 className="h-6 w-6" />,
};

export function SubscriptionCard({
  brandId,
  currentTier,
  userEmail,
  isViewer = false,
  onUpgrade,
}: SubscriptionCardProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleUpgrade = async (tier: PricingTier) => {
    if (isViewer) return;
    if (tier === currentTier) return;
    if (tier === "free") return; // Can't "upgrade" to free

    setIsLoading(tier);
    try {
      if (onUpgrade) {
        await onUpgrade(tier);
      } else {
        // Default behavior - redirect to checkout
        const response = await fetch(`/api/brands/${brandId}/billing/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier, userEmail }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.checkoutUrl) {
            window.location.href = data.checkoutUrl;
          }
        }
      }
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {(Object.entries(PRICING_TIERS) as [PricingTier, typeof PRICING_TIERS[PricingTier]][]).map(
        ([tier, data]) => {
          const isCurrent = tier === currentTier;
          const isDowngrade = tier !== "free" && PRICING_TIERS[tier].price < PRICING_TIERS[currentTier as PricingTier]?.price;

          return (
            <Card
              key={tier}
              className={`relative ${
                isCurrent ? "border-primary shadow-md" : ""
              }`}
            >
              {isCurrent && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                  Current Plan
                </Badge>
              )}
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {tierIcons[tier]}
                    <CardTitle>{data.name}</CardTitle>
                  </div>
                </div>
                <CardDescription>
                  {data.price === 0 ? (
                    "Free forever"
                  ) : (
                    <>
                      ${data.price}
                      <span className="text-xs">/{data.interval}</span>
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {data.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isViewer || isLoading === tier || isCurrent}
                  onClick={() => handleUpgrade(tier)}
                >
                  {isLoading === tier ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : isCurrent ? (
                    "Current"
                  ) : isDowngrade ? (
                    "Downgrade"
                  ) : (
                    "Upgrade"
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        }
      )}
    </div>
  );
}
