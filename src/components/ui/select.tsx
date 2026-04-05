"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

const Select = ({
  value,
  onValueChange,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}) => {
  return (
    <div className="relative">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as any, {
            value,
            onValueChange,
          });
        }
        return child;
      })}
    </div>
  );
};

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    value?: string;
    onValueChange?: (value: string) => void;
  }
>(({ className, children, value, onValueChange, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    onClick={() => {
      // Open the select options
      const select = (ref as any).current?.parentElement?.querySelector("select");
      if (select) select.click();
    }}
    {...props}
  >
    {children}
    <svg
      className="h-4 w-4 opacity-50"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  </button>
));
SelectTrigger.displayName = "SelectTrigger";

const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  return (
    <span className="native-select-value">{placeholder}</span>
  );
};

const SelectContent = ({
  children,
  value,
  onValueChange,
}: {
  children: React.ReactNode;
  value: string;
  onValueChange: (value: string) => void;
}) => {
  return (
    <select
      className="absolute inset-0 opacity-0 cursor-pointer"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  );
};

const SelectItem = ({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) => {
  return <option value={value}>{children}</option>;
};

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
};
