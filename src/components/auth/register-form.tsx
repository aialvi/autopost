"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, Circle, Eye, EyeOff, Loader2 } from "lucide-react";
import { registerAction } from "@/app/(auth)/register/actions";
import { registerSchema } from "@/lib/auth/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fields = [
  { name: "name", label: "Name", type: "text", autoComplete: "name", placeholder: "Your name" },
  { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@example.com" },
  { name: "password", label: "Password", type: "password", autoComplete: "new-password", placeholder: "Create a password" },
  { name: "confirmPassword", label: "Confirm password", type: "password", autoComplete: "new-password", placeholder: "Re-enter your password" },
] as const;

type FieldName = typeof fields[number]["name"];
type FieldErrors = Partial<Record<FieldName, string[]>>;

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, {});
  const [values, setValues] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = { ...state.errors, ...clientErrors };
  const requirements = [
    { label: "At least 8 characters", met: values.password.length >= 8 },
    { label: "An uppercase letter", met: /[A-Z]/.test(values.password) },
    { label: "A lowercase letter", met: /[a-z]/.test(values.password) },
    { label: "A number", met: /\d/.test(values.password) },
  ];

  useEffect(() => {
    const invalidField = fields.find((field) => state.errors?.[field.name]?.length);
    if (invalidField) formRef.current?.querySelector<HTMLInputElement>(`[name="${invalidField.name}"]`)?.focus();
  }, [state]);

  return (
    <form ref={formRef} action={action} noValidate aria-busy={pending} className="space-y-5" onSubmit={(event) => {
      const result = registerSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
      if (!result.success) {
        event.preventDefault();
        const nextErrors = result.error.flatten().fieldErrors;
        setClientErrors(nextErrors);
        const first = fields.find((field) => nextErrors[field.name]?.length);
        if (first) formRef.current?.querySelector<HTMLInputElement>(`[name="${first.name}"]`)?.focus();
      } else {
        setClientErrors({});
      }
    }}>
      {state.message && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.message}</p>}
      {fields.map((field) => {
        const isPassword = field.type === "password";
        const error = errors[field.name]?.[0];
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>{field.label}</Label>
            <div className="relative">
              <Input id={field.name} name={field.name} type={isPassword && showPassword ? "text" : field.type} autoComplete={field.autoComplete} placeholder={field.placeholder} required disabled={pending} value={values[field.name]} aria-invalid={!!error} aria-describedby={[error ? `${field.name}-error` : "", field.name === "password" ? "password-requirements" : ""].filter(Boolean).join(" ") || undefined} className={`h-11 ${isPassword ? "pr-12" : ""} ${error ? "border-red-500" : ""}`} onChange={(event) => {
                setValues((previous) => ({ ...previous, [field.name]: event.target.value }));
                setClientErrors((previous) => ({ ...previous, [field.name]: [] }));
              }} />
              {field.name === "password" && (
                <button type="button" disabled={pending} onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide passwords" : "Show passwords"} aria-pressed={showPassword} className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              )}
            </div>
            {error && <p id={`${field.name}-error`} role="alert" className="text-sm text-red-700">{error}</p>}
            {field.name === "password" && (
              <ul id="password-requirements" className="grid grid-cols-2 gap-x-3 gap-y-2 pt-1 text-xs">
                {requirements.map(({ label, met }) => (
                  <li key={label} className={`flex items-center gap-1.5 ${met ? "text-emerald-700" : "text-muted-foreground"}`}>
                    {met ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <Circle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                    <span className="sr-only">{met ? "Met: " : "Required: "}</span>{label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
      <Button type="submit" disabled={pending} className="h-11 w-full">{pending && <Loader2 className="animate-spin" />}{pending ? "Creating account…" : "Create account"}</Button>
    </form>
  );
}
