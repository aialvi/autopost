import { isDemoEnabled, isDemoUser } from "@/lib/demo/config";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Define protected and public routes
const protectedRoutes = ["/dashboard"];

export default auth((req) => {
  const { nextUrl } = req;
  if (isDemoUser(req.auth?.user?.id) && !nextUrl.pathname.startsWith("/api/auth/")) {
    if (!isDemoEnabled()) {
      return nextUrl.pathname.startsWith("/api/")
        ? NextResponse.json({ error: "The demo is currently unavailable." }, { status: 403 })
        : NextResponse.redirect(new URL("/api/auth/signout", nextUrl));
    }
    if (nextUrl.pathname.startsWith("/api/") && !["GET", "HEAD"].includes(req.method)) {
      return NextResponse.json({ error: "The demo workspace is read-only." }, { status: 403 });
    }
  }
  const isLoggedIn = !!req.auth;
  const isProtectedRoute = protectedRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );
  const isAuthRoute = nextUrl.pathname.startsWith("/login") ||
    nextUrl.pathname.startsWith("/register");

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Redirect unauthenticated users to login
  if (!isLoggedIn && isProtectedRoute) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
