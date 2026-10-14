import GoogleProvider from "next-auth/providers/google";

export type Provider = "google";

export function getProviders(): Record<string, ReturnType<typeof GoogleProvider>> {
  const providers: Record<string, ReturnType<typeof GoogleProvider>> = {};

  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    providers.google = GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    });
  }

  return providers;
}

export function isOAuthEnabled(): boolean {
  return !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}
