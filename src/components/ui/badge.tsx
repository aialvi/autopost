"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

const Badge = ({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "outline" | "secondary" | "destructive";
}) => {
  return (
    <div
      className={cn(
        "inline-flex h-6 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border px-2.5 text-xs font-medium leading-none align-middle",
        variant === "default" && "border-transparent bg-primary text-primary-foreground",
        variant === "outline" && "text-foreground",
        variant === "secondary" && "border-transparent bg-secondary text-secondary-foreground",
        variant === "destructive" && "border-transparent bg-destructive text-destructive-foreground",
        className
      )}
      {...props}
    />
  );
};

export { Badge };
