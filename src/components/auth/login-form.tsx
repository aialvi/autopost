"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { FlaskConical, Loader2 } from "lucide-react";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending} className="h-11 w-full">{pending && <Loader2 className="animate-spin" />}{pending ? "Signing in…" : "Sign in"}</Button>;
}

export function LoginForm({ action, demoEnabled, fillDemo = false }: { action: (formData: FormData) => Promise<void>; demoEnabled: boolean; fillDemo?: boolean }) {
  const [email, setEmail] = useState(fillDemo ? DEMO_EMAIL : "");
  const [password, setPassword] = useState(fillDemo ? DEMO_PASSWORD : "");
  const submitRef = useRef<HTMLDivElement>(null);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="h-11" /></div>
      <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" className="h-11" /></div>
      <div ref={submitRef}><SubmitButton /></div>
      {demoEnabled && (
        <div className="rounded-xl border border-dashed bg-neutral-50 p-4">
          <p className="text-sm font-semibold">Want to look around first?</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Explore a full dashboard with sample Shopify, Meta, Snapchat, Google Ads, and TikTok data.</p>
          <Button type="button" variant="outline" className="mt-3 h-10 w-full" onClick={() => {
            setEmail(DEMO_EMAIL);
            setPassword(DEMO_PASSWORD);
            submitRef.current?.querySelector("button")?.focus();
          }}><FlaskConical />Fill demo credentials</Button>
          <p className="mt-2 break-all text-xs text-muted-foreground">{DEMO_EMAIL} · {DEMO_PASSWORD}</p>
          <p className="mt-1 text-xs text-muted-foreground">Then select Sign in. Demo access is read-only.</p>
        </div>
      )}
    </form>
  );
}
